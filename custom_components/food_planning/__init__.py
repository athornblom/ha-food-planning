"""Food Planning: recipes imported from URLs and a food shopping list."""

from __future__ import annotations

from pathlib import Path

from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv, entity_registry as er
from homeassistant.helpers.typing import ConfigType
from homeassistant.loader import async_get_integration

from .const import (
    CARD_FILENAME,
    CONF_LANGUAGE,
    DEFAULT_LANGUAGE,
    DOMAIN,
    FRONTEND_URL,
    IMAGES_URL,
    REMOVED_ENTITIES,
)
from .data import FoodPlanningConfigEntry, FoodPlanningData
from .images import async_delete_all_images, async_repair_images, ensure_images_dir
from .merge import ListMerger
from .pantry_match import PantryMatcher
from .services import async_setup_services
from .store import LISTS, FoodPlanningStore
from .websocket import async_setup_websocket

PLATFORMS = [Platform.TODO]

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Register actions, the websocket API, the recipe card and image folder."""
    async_setup_services(hass)
    async_setup_websocket(hass)

    images = await hass.async_add_executor_job(ensure_images_dir, hass)
    await hass.http.async_register_static_paths(
        [
            StaticPathConfig(
                FRONTEND_URL,
                str(Path(__file__).parent / "frontend"),
                cache_headers=False,
            ),
            StaticPathConfig(IMAGES_URL, str(images), cache_headers=True),
        ]
    )
    # Versioned URL so browsers fetch the card again after an update.
    integration = await async_get_integration(hass, DOMAIN)
    add_extra_js_url(hass, f"{FRONTEND_URL}/{CARD_FILENAME}?v={integration.version}")
    return True


async def async_setup_entry(
    hass: HomeAssistant, entry: FoodPlanningConfigEntry
) -> bool:
    """Load stored data and set up the shopping list and pantry."""
    _remove_old_entities(hass, entry)
    language = entry.options.get(CONF_LANGUAGE, DEFAULT_LANGUAGE).casefold()
    store = await FoodPlanningStore.async_create(
        hass, "sv" if language in ("swedish", "svenska", "sv") else "en"
    )
    mergers = {name: ListMerger(hass, entry, name) for name in LISTS}
    for merger in mergers.values():
        entry.async_on_unload(merger.async_cancel)
    matcher = PantryMatcher(hass, entry)
    entry.async_on_unload(matcher.async_cancel)
    entry.runtime_data = FoodPlanningData(store=store, mergers=mergers, matcher=matcher)
    # Re-check missing ingredients whenever the pantry or recipes change.
    entry.async_on_unload(store.async_add_listener(matcher.async_schedule))
    matcher.async_schedule()
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_create_background_task(
        hass, async_repair_images(hass, store), "food_planning image repair"
    )
    return True


def _remove_old_entities(hass: HomeAssistant, entry: FoodPlanningConfigEntry) -> None:
    """Drop entities that earlier versions created and the recipe card replaced."""
    registry = er.async_get(hass)
    for platform, key in REMOVED_ENTITIES:
        if entity_id := registry.async_get_entity_id(
            platform, DOMAIN, f"{entry.entry_id}_{key}"
        ):
            registry.async_remove(entity_id)


async def async_unload_entry(
    hass: HomeAssistant, entry: FoodPlanningConfigEntry
) -> bool:
    """Unload the lists."""
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)


async def async_remove_entry(
    hass: HomeAssistant, entry: FoodPlanningConfigEntry
) -> None:
    """Delete recipes, the shopping list and saved images."""
    await FoodPlanningStore(hass).async_remove()
    await async_delete_all_images(hass)
