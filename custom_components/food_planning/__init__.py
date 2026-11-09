"""Food Planning: recipes imported from URLs and a food shopping list."""

from __future__ import annotations

from pathlib import Path

from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv, entity_registry as er
from homeassistant.helpers.dispatcher import async_dispatcher_send
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
    SIGNAL_RECIPES_UPDATED,
    SIGNAL_TIMERS_UPDATED,
)
from .data import FoodPlanningConfigEntry, FoodPlanningData
from .images import async_delete_all_images, async_repair_images, ensure_images_dir
from .merge import ListMerger
from .offers import (
    async_remove_offers_storage,
    async_setup_offer_services,
    async_setup_offers,
)
from .pantry_match import PantryMatcher
from .services import async_setup_services
from .store import LISTS, FoodPlanningStore
from .timers import TimerManager
from .websocket import async_setup_websocket
from .weekly import WeeklyPlanner

PLATFORMS = [Platform.BINARY_SENSOR, Platform.EVENT, Platform.SENSOR, Platform.TODO]

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Register actions, the websocket API, the recipe card and image folder."""
    async_setup_services(hass)
    async_setup_offer_services(hass)
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
    """Load stored data and set up the lists and the cooking timers."""
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
    timers = TimerManager(hass)
    await timers.async_load()
    entry.async_on_unload(timers.async_stop)
    planner = WeeklyPlanner(hass, entry)
    entry.async_on_unload(planner.async_stop)
    entry.runtime_data = FoodPlanningData(
        store=store, mergers=mergers, matcher=matcher, timers=timers, planner=planner
    )
    # Optional; never fails setup.
    await async_setup_offers(hass, entry)
    # The schedule, stores and offers come from the options.
    entry.async_on_unload(entry.add_update_listener(_async_options_updated))
    # Re-check missing ingredients whenever the pantry or recipes change.
    entry.async_on_unload(store.async_add_listener(matcher.async_schedule))
    matcher.async_schedule()
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    # After the entities, so timers that ended during a restart fire events.
    timers.async_start()
    planner.async_start()
    # Tell open dashboards (subscribed through the websocket API) about
    # changes, and refresh them now in case this is a reload.
    entry.async_on_unload(
        store.async_add_listener(
            lambda: async_dispatcher_send(hass, SIGNAL_RECIPES_UPDATED)
        )
    )
    entry.async_on_unload(
        timers.async_add_listener(
            lambda: async_dispatcher_send(hass, SIGNAL_TIMERS_UPDATED)
        )
    )
    hass.loop.call_soon(async_dispatcher_send, hass, SIGNAL_RECIPES_UPDATED)
    hass.loop.call_soon(async_dispatcher_send, hass, SIGNAL_TIMERS_UPDATED)
    entry.async_create_background_task(
        hass, async_repair_images(hass, store), "food_planning image repair"
    )
    return True


async def _async_options_updated(
    hass: HomeAssistant, entry: FoodPlanningConfigEntry
) -> None:
    await hass.config_entries.async_reload(entry.entry_id)


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
    """Delete recipes, the shopping list, timers and saved images."""
    await FoodPlanningStore(hass).async_remove()
    await TimerManager(hass).async_remove()
    await async_remove_offers_storage(hass)
    await async_delete_all_images(hass)
