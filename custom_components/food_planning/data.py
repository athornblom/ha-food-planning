"""Runtime data and the recipe import flow shared by services and entities."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import CALLBACK_TYPE, HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError

from .const import CONF_AI_TASK_ENTITY, CONF_LANGUAGE, DEFAULT_LANGUAGE, DOMAIN
from .extraction import RecipeSource, async_extract_recipe, async_fetch_source
from .store import FoodPlanningStore, Recipe

type FoodPlanningConfigEntry = ConfigEntry[FoodPlanningData]


@dataclass
class FoodPlanningData:
    """Everything the integration's entities and services share."""

    store: FoodPlanningStore
    # Dashboard input state. Not persisted: it only lives until a restart.
    url_input: str = ""
    selected_recipe_uid: str | None = None
    _ui_listeners: list[Callable[[], None]] = field(default_factory=list)

    @callback
    def async_add_ui_listener(self, listener: Callable[[], None]) -> CALLBACK_TYPE:
        """Call listener when the dashboard input state changes."""
        self._ui_listeners.append(listener)

        @callback
        def _remove() -> None:
            self._ui_listeners.remove(listener)

        return _remove

    @callback
    def async_notify_ui(self) -> None:
        """Tell entities that show dashboard input state to update."""
        for listener in list(self._ui_listeners):
            listener()


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

    data = entry.runtime_data
    data.store.add_recipe(recipe)
    if add_to_shopping_list:
        data.store.add_recipe_to_shopping(recipe)
    await data.store.async_save()

    data.selected_recipe_uid = recipe.uid
    data.async_notify_ui()
    return recipe
