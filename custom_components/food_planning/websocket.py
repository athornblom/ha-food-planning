"""Websocket API used by the recipe card."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant, callback

from .const import DOMAIN
from .data import FoodPlanningConfigEntry, async_delete_recipe
from .images import image_url
from .store import Recipe


@callback
def async_setup_websocket(hass: HomeAssistant) -> None:
    """Register the websocket commands."""
    websocket_api.async_register_command(hass, ws_subscribe_recipes)
    websocket_api.async_register_command(hass, ws_delete_recipe)


def _loaded_entry(hass: HomeAssistant) -> FoodPlanningConfigEntry | None:
    return next(
        (
            entry
            for entry in hass.config_entries.async_entries(DOMAIN)
            if entry.state is ConfigEntryState.LOADED
        ),
        None,
    )


def _recipe_json(recipe: Recipe) -> dict[str, Any]:
    return {
        "uid": recipe.uid,
        "title": recipe.title,
        "servings": recipe.servings,
        "ingredients": recipe.ingredients,
        "steps": recipe.steps,
        "notes": recipe.notes,
        "source_url": recipe.source_url,
        "image_url": image_url(recipe.image) if recipe.image else recipe.image_url,
        "created": recipe.created,
    }


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/recipes/subscribe"})
@callback
def ws_subscribe_recipes(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Send all recipes now and again after every change."""
    entry = _loaded_entry(hass)
    if entry is None:
        connection.send_error(msg["id"], "not_loaded", "Food Planning is not loaded")
        return
    store = entry.runtime_data.store

    @callback
    def send_recipes() -> None:
        connection.send_message(
            websocket_api.event_message(
                msg["id"], {"recipes": [_recipe_json(r) for r in store.recipes]}
            )
        )

    connection.subscriptions[msg["id"]] = store.async_add_listener(send_recipes)
    connection.send_result(msg["id"])
    send_recipes()


@websocket_api.websocket_command(
    {vol.Required("type"): f"{DOMAIN}/recipes/delete", vol.Required("uid"): str}
)
@websocket_api.async_response
async def ws_delete_recipe(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Delete a recipe."""
    entry = _loaded_entry(hass)
    if entry is None:
        connection.send_error(msg["id"], "not_loaded", "Food Planning is not loaded")
        return
    if not await async_delete_recipe(hass, entry, msg["uid"]):
        connection.send_error(msg["id"], "not_found", "Recipe not found")
        return
    connection.send_result(msg["id"])
