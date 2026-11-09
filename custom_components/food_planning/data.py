"""Runtime data and the recipe flows shared by services and the websocket API."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
import logging
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError

from .const import (
    CONF_AI_TASK_ENTITY,
    CONF_LANGUAGE,
    CONF_UPDATE_PANTRY,
    DEFAULT_LANGUAGE,
    DEFAULT_UPDATE_PANTRY,
    DOMAIN,
)
from .extraction import RecipeSource, async_extract_recipe, async_fetch_source
from .images import async_delete_image, async_save_image
from .merge import ListMerger
from .offer_lookup import OfferLookup
from .pantry import async_consume_recipe
from .pantry_match import PantryMatcher
from .store import PANTRY, SHOPPING, FoodPlanningStore, Recipe
from .timers import TimerManager
from .weekly import EVENT_COOKED, WeeklyPlanner

_LOGGER = logging.getLogger(__name__)

type FoodPlanningConfigEntry = ConfigEntry[FoodPlanningData]


@dataclass
class FoodPlanningData:
    """Everything the integration's entity, services and API share."""

    store: FoodPlanningStore
    # One per list (SHOPPING, PANTRY): merges duplicates after additions.
    mergers: dict[str, ListMerger]
    # Re-checks which recipe ingredients are missing at home.
    matcher: PantryMatcher
    # Cooking timers.
    timers: TimerManager
    # Veckans middagar.
    planner: WeeklyPlanner
    # Set by the optional offers module while it's turned on.
    offers: OfferLookup | None = None
    # Entity factories added by optional modules, by platform: called by
    # the core platforms with their async_add_entities.
    entity_hooks: dict[str, list[Callable[[Callable[..., Any]], None]]] = field(
        default_factory=dict
    )


async def async_import_recipe(
    hass: HomeAssistant,
    entry: FoodPlanningConfigEntry,
    *,
    url: str | None = None,
    text: str | None = None,
    add_to_shopping_list: bool = False,
) -> tuple[Recipe, bool]:
    """Fetch, extract and store a recipe from a URL or pasted text.

    Returns the recipe and whether it is new. A link that was imported
    before returns the saved recipe instead, without asking the AI again.
    """
    store = entry.runtime_data.store
    if url:
        if existing := store.find_recipe_by_url(url):
            return existing, False
        source = await async_fetch_source(hass, url.strip())
        # Short links (vm.tiktok.com) only match after the redirect.
        if existing := store.find_recipe_by_url(source.url):
            return existing, False
    elif text and text.strip():
        source = RecipeSource(text=text.strip())
    else:
        raise HomeAssistantError(
            translation_domain=DOMAIN, translation_key="missing_input"
        )

    extracted = await async_extract_recipe(
        hass,
        source,
        language=entry.options.get(CONF_LANGUAGE, DEFAULT_LANGUAGE),
        ai_task_entity=entry.options.get(CONF_AI_TASK_ENTITY),
        categories=entry.runtime_data.store.describe_categories(),
    )
    recipe = Recipe(
        title=extracted.title,
        ingredients=extracted.ingredients,
        steps=extracted.steps,
        servings=extracted.servings,
        notes=extracted.notes,
        source_url=source.url,
        image_url=source.image_url,
        categories=entry.runtime_data.store.normalize_categories(extracted.categories),
        total_minutes=extracted.total_minutes,
        time_checked=True,
    )
    recipe.image = await async_save_image(hass, recipe.uid, source.image_url)

    data = entry.runtime_data
    data.store.add_recipe(recipe)
    if add_to_shopping_list:
        async_add_recipe_to_shopping(entry, recipe)
    await data.store.async_save()
    return recipe, True


def async_add_recipe_to_shopping(
    entry: FoodPlanningConfigEntry,
    recipe: Recipe,
    *,
    only_missing: bool = False,
    ingredients: list[str] | None = None,
) -> int:
    """Add a recipe's ingredients (or only those missing at home).

    Schedules a duplicate merge. The caller saves the store. Returns the
    number of items added.
    """
    data = entry.runtime_data
    added = data.store.add_recipe_to_shopping(
        recipe, only_missing=only_missing, ingredients=ingredients
    )
    data.mergers[SHOPPING].async_schedule(item.uid for item in added)
    return len(added)


async def async_move_bought_to_pantry(entry: FoodPlanningConfigEntry) -> int:
    """Move ticked-off shopping items to the pantry. Returns how many moved."""
    data = entry.runtime_data
    moved = data.store.move_bought_to_pantry()
    if moved:
        await data.store.async_save()
        data.mergers[PANTRY].async_schedule(item.uid for item in moved)
    return len(moved)


async def async_delete_recipe(
    hass: HomeAssistant, entry: FoodPlanningConfigEntry, uid: str
) -> bool:
    """Delete a recipe and its saved image. Returns False if it didn't exist."""
    store = entry.runtime_data.store
    recipe = store.delete_recipe(uid)
    if recipe is None:
        return False
    await store.async_save()
    await async_delete_image(hass, recipe.image)
    return True


async def async_mark_cooked(
    hass: HomeAssistant, entry: FoodPlanningConfigEntry, recipe: Recipe
) -> None:
    """Remember a cooked recipe, tick it off the week, update At home."""
    data = entry.runtime_data
    data.store.mark_cooked(recipe)
    await data.store.async_save()
    data.planner.fire(EVENT_COOKED, {"recipe": recipe.title, "uid": recipe.uid})
    if entry.options.get(CONF_UPDATE_PANTRY, DEFAULT_UPDATE_PANTRY):
        entry.async_create_background_task(
            hass,
            async_consume_recipe(hass, entry, recipe),
            "food_planning pantry update",
        )


def async_add_hooked_entities(
    entry: FoodPlanningConfigEntry, platform: str, add: Callable[..., Any]
) -> None:
    """Add the entities optional modules registered for a platform.

    A module that fails here is logged and skipped, never fails the core.
    """
    for hook in entry.runtime_data.entity_hooks.get(platform, []):
        try:
            hook(add)
        except Exception:
            _LOGGER.exception(
                "Could not add %s entities of an optional module", platform
            )
