"""Runtime data and the recipe flows shared by services and the websocket API."""

from __future__ import annotations

from dataclasses import dataclass

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError

from .const import CONF_AI_TASK_ENTITY, CONF_LANGUAGE, DEFAULT_LANGUAGE, DOMAIN
from .extraction import RecipeSource, async_extract_recipe, async_fetch_source
from .images import async_delete_image, async_save_image
from .merge import ListMerger
from .store import PANTRY, SHOPPING, FoodPlanningStore, Recipe

type FoodPlanningConfigEntry = ConfigEntry[FoodPlanningData]


@dataclass
class FoodPlanningData:
    """Everything the integration's entity, services and API share."""

    store: FoodPlanningStore
    # One per list (SHOPPING, PANTRY): merges duplicates after additions.
    mergers: dict[str, ListMerger]


async def async_import_recipe(
    hass: HomeAssistant,
    entry: FoodPlanningConfigEntry,
    *,
    url: str | None = None,
    text: str | None = None,
    add_to_shopping_list: bool = False,
) -> Recipe:
    """Fetch, extract and store a recipe from a URL or pasted text."""
    if url:
        source = await async_fetch_source(hass, url.strip())
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
    )
    recipe = Recipe(
        title=extracted.title,
        ingredients=extracted.ingredients,
        steps=extracted.steps,
        servings=extracted.servings,
        notes=extracted.notes,
        source_url=source.url,
        image_url=source.image_url,
    )
    recipe.image = await async_save_image(hass, recipe.uid, source.image_url)

    data = entry.runtime_data
    data.store.add_recipe(recipe)
    if add_to_shopping_list:
        async_add_recipe_to_shopping(entry, recipe)
    await data.store.async_save()
    return recipe


def async_add_recipe_to_shopping(entry: FoodPlanningConfigEntry, recipe: Recipe) -> int:
    """Add a recipe's ingredients and schedule a duplicate merge.

    The caller saves the store. Returns the number of items added.
    """
    data = entry.runtime_data
    added = data.store.add_recipe_to_shopping(recipe)
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
