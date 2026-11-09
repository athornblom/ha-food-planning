"""Websocket API for the Erbjudanden view: every current offer at the stores."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect

from ..const import DOMAIN, SIGNAL_OFFERS_UPDATED
from .coordinator import OffersCoordinator
from .services import offer_json


def _coordinator(hass: HomeAssistant) -> OffersCoordinator | None:
    for entry in hass.config_entries.async_entries(DOMAIN):
        if entry.state is ConfigEntryState.LOADED and isinstance(
            offers := getattr(entry.runtime_data, "offers", None), OffersCoordinator
        ):
            return offers
    return None


@callback
def async_setup_offer_websocket(hass: HomeAssistant) -> None:
    """Register the offers websocket command."""
    websocket_api.async_register_command(hass, ws_subscribe_offers)


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/offers/subscribe"})
@callback
def ws_subscribe_offers(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Send all current offers now and after every fetch.

    Each offer says which of the household's products it matches
    ("products"), so the view can show "your" offers first.
    """

    @callback
    def send() -> None:
        coordinator = _coordinator(hass)
        payload: dict[str, Any] = {"enabled": False, "stores": [], "offers": []}
        if coordinator is not None and coordinator.data is not None:
            data = coordinator.data
            payload = {
                "enabled": True,
                "min_discount": coordinator.min_discount,
                "fetched_at": data.fetched_at,
                "stores": [
                    {
                        "id": info.id,
                        "title": info.title,
                        "chain": info.chain,
                        "valid_until": info.valid_until,
                        "ok": info.ok,
                    }
                    for info in data.stores.values()
                ],
                "offers": [
                    offer_json(coordinator, offer, info)
                    | {"id": offer.id, "store_id": offer.store_id}
                    for offer in data.current()
                    if (info := data.stores.get(offer.store_id)) is not None
                ],
            }
        connection.send_message(websocket_api.event_message(msg["id"], payload))

    connection.subscriptions[msg["id"]] = async_dispatcher_connect(
        hass, SIGNAL_OFFERS_UPDATED, send
    )
    connection.send_result(msg["id"])
    send()
