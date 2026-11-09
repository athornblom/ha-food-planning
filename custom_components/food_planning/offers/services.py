"""Actions that return offers: get_offers and search_offers."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import (
    HomeAssistant,
    ServiceCall,
    ServiceResponse,
    SupportsResponse,
    callback,
)
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import config_validation as cv

from ..const import DOMAIN, SERVICE_GET_OFFERS, SERVICE_SEARCH_OFFERS
from .coordinator import OffersCoordinator, StoreInfo
from .models import Offer

GET_SCHEMA = vol.Schema({vol.Required("store"): cv.string})
SEARCH_SCHEMA = vol.Schema(
    {
        vol.Required("query"): cv.string,
        vol.Optional("stores"): vol.All(cv.ensure_list, [cv.string]),
        vol.Optional("min_discount"): vol.All(
            vol.Coerce(int), vol.Range(min=0, max=100)
        ),
    }
)
MAX_RESULTS = 100


def _coordinator(hass: HomeAssistant) -> OffersCoordinator:
    for entry in hass.config_entries.async_entries(DOMAIN):
        if entry.state is ConfigEntryState.LOADED and isinstance(
            offers := getattr(entry.runtime_data, "offers", None), OffersCoordinator
        ):
            return offers
    raise ServiceValidationError(
        translation_domain=DOMAIN, translation_key="offers_off"
    )


def _find_stores(coordinator: OffersCoordinator, keys: list[str]) -> list[StoreInfo]:
    """Stores by id or (part of) their name."""
    stores = coordinator.data.stores if coordinator.data else {}
    result = []
    for key in keys:
        wanted = key.strip().casefold()
        match = stores.get(key) or next(
            (s for s in stores.values() if wanted in s.title.casefold()), None
        )
        if match is None:
            raise ServiceValidationError(
                translation_domain=DOMAIN,
                translation_key="store_not_found",
                translation_placeholders={"store": key},
            )
        if match not in result:
            result.append(match)
    return result


def offer_json(
    coordinator: OffersCoordinator, offer: Offer, info: StoreInfo
) -> dict[str, Any]:
    """An offer in action responses and on the dashboards."""
    hit = offer.hit(info.title, info.chain).as_json()
    return hit | {
        "description": offer.description,
        "unit_price": round(offer.unit_price, 2),
        "valid_from": offer.valid_from,
        "products": coordinator.product_names(offer),
    }


def _sorted(offers: list[tuple[Offer, StoreInfo]]) -> list[tuple[Offer, StoreInfo]]:
    return sorted(
        offers, key=lambda o: (-(o[0].discount_percent or 0), o[0].unit_price)
    )


@callback
def async_setup_offer_services(hass: HomeAssistant) -> None:
    """Register the offer actions. They answer "offers are off" until turned on."""

    async def get_offers(call: ServiceCall) -> ServiceResponse:
        coordinator = _coordinator(hass)
        (info,) = _find_stores(coordinator, [call.data["store"]])
        offers = coordinator.data.current(info.id) if coordinator.data else []
        return {
            "store": info.title,
            "valid_from": info.valid_from,
            "valid_until": info.valid_until,
            "offers": [
                offer_json(coordinator, o, info)
                for o, _i in _sorted([(o, info) for o in offers])
            ],
        }

    async def search_offers(call: ServiceCall) -> ServiceResponse:
        coordinator = _coordinator(hass)
        data = coordinator.data
        if data is None:
            return {"offers": []}
        stores = (
            _find_stores(coordinator, call.data["stores"])
            if call.data.get("stores")
            else list(data.stores.values())
        )
        query = " ".join(call.data["query"].casefold().split())
        min_discount = call.data.get("min_discount")
        found = []
        for info in stores:
            for offer in data.current(info.id):
                if (
                    min_discount is not None
                    and (offer.discount_percent or 0) < min_discount
                ):
                    continue
                text = f"{offer.heading} {offer.description}".casefold()
                if query in text or any(
                    query in name for name in coordinator.product_names(offer)
                ):
                    found.append((offer, info))
        return {
            "offers": [
                offer_json(coordinator, o, i) for o, i in _sorted(found)[:MAX_RESULTS]
            ]
        }

    hass.services.async_register(
        DOMAIN,
        SERVICE_GET_OFFERS,
        get_offers,
        schema=GET_SCHEMA,
        supports_response=SupportsResponse.ONLY,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_SEARCH_OFFERS,
        search_offers,
        schema=SEARCH_SCHEMA,
        supports_response=SupportsResponse.ONLY,
    )
