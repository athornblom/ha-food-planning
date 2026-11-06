"""Food Planning: recipes imported from URLs and a food shopping list."""

from __future__ import annotations

from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.typing import ConfigType

from .const import DOMAIN
from .data import FoodPlanningConfigEntry, FoodPlanningData
from .services import async_setup_services
from .store import FoodPlanningStore

PLATFORMS = [Platform.BUTTON, Platform.SELECT, Platform.TEXT, Platform.TODO]

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Register the integration's actions."""
    async_setup_services(hass)
    return True


async def async_setup_entry(
    hass: HomeAssistant, entry: FoodPlanningConfigEntry
) -> bool:
    """Load stored recipes and set up the entities."""
    store = await FoodPlanningStore.async_create(hass)
    entry.runtime_data = FoodPlanningData(store=store)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(
    hass: HomeAssistant, entry: FoodPlanningConfigEntry
) -> bool:
    """Unload the entities."""
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)


async def async_remove_entry(
    hass: HomeAssistant, entry: FoodPlanningConfigEntry
) -> None:
    """Delete stored recipes and the shopping list when the entry is deleted."""
    await FoodPlanningStore(hass).async_remove()
