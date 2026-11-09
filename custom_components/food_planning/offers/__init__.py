"""Erbjudanden: weekly offers from the selected stores' flyers. Optional.

Separate from the core: the core only calls async_setup_offers() and
async_setup_offer_services() at setup, and otherwise sees an OfferLookup
(see offer_lookup.py) on the runtime data. Nothing here may break the
integration's setup: if the flyer API fails, only the offer entities go
unavailable.

Relies on Tjek's unofficial flyer API, which may change or stop working.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from ..const import CONF_OFFERS, CONF_OFFERS_STORES, DEFAULT_OFFERS
from .coordinator import STORAGE_KEY, STORAGE_VERSION, OffersCoordinator
from .entities import offer_binary_sensors, offer_sensors
from .services import async_setup_offer_services

if TYPE_CHECKING:
    from ..data import FoodPlanningConfigEntry

_LOGGER = logging.getLogger(__name__)

__all__ = [
    "async_remove_offers_storage",
    "async_setup_offer_services",
    "async_setup_offers",
]


async def async_setup_offers(
    hass: HomeAssistant, entry: FoodPlanningConfigEntry
) -> None:
    """Turn on offers if they're enabled; never raises."""
    if not entry.options.get(CONF_OFFERS, DEFAULT_OFFERS):
        return
    if not entry.options.get(CONF_OFFERS_STORES):
        _LOGGER.info("Offers are on, but no stores are selected")
        return
    try:
        coordinator = OffersCoordinator(hass, entry)
        await coordinator.async_load()
        await coordinator.async_ensure_store_info()
    except Exception:  # - offers must never break setup
        _LOGGER.exception("Could not set up offers; the rest works without them")
        return
    data = entry.runtime_data
    data.offers = coordinator
    data.entity_hooks.setdefault("sensor", []).append(
        lambda add: add(offer_sensors(entry, coordinator))
    )
    data.entity_hooks.setdefault("binary_sensor", []).append(
        lambda add: add(offer_binary_sensors(entry, coordinator))
    )
    entry.async_on_unload(coordinator.async_stop)
    coordinator.async_start()


def coordinator_of(entry: FoodPlanningConfigEntry) -> OffersCoordinator | None:
    """The offers coordinator, when offers are on."""
    offers = getattr(entry.runtime_data, "offers", None)
    return offers if isinstance(offers, OffersCoordinator) else None


async def async_remove_offers_storage(hass: HomeAssistant) -> None:
    """Delete the saved offers (when the integration is removed)."""
    await Store(hass, STORAGE_VERSION, STORAGE_KEY).async_remove()
