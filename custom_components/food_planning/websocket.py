"""Websocket API used by the recipe card."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.util import dt as dt_util

from .categorize import async_categorize_recipes
from .const import (
    CONF_ADMIN_ONLY,
    CONF_UPDATE_PANTRY,
    DEFAULT_ADMIN_ONLY,
    DEFAULT_UPDATE_PANTRY,
    DOMAIN,
    SIGNAL_RECIPES_UPDATED,
    SIGNAL_TIMERS_UPDATED,
)
from .data import FoodPlanningConfigEntry, FoodPlanningData, async_delete_recipe
from .images import image_url
from .pantry import async_consume_recipe
from .store import FoodPlanningStore, Recipe


@callback
def async_setup_websocket(hass: HomeAssistant) -> None:
    """Register the websocket commands."""
    websocket_api.async_register_command(hass, ws_subscribe_recipes)
    websocket_api.async_register_command(hass, ws_delete_recipe)
    websocket_api.async_register_command(hass, ws_update_recipe)
    websocket_api.async_register_command(hass, ws_mark_cooked)
    websocket_api.async_register_command(hass, ws_subscribe_timers)
    websocket_api.async_register_command(hass, ws_set_categories)


def _loaded_entry(hass: HomeAssistant) -> FoodPlanningConfigEntry | None:
    return next(
        (
            entry
            for entry in hass.config_entries.async_entries(DOMAIN)
            if entry.state is ConfigEntryState.LOADED
        ),
        None,
    )


def _current_data(hass: HomeAssistant) -> FoodPlanningData | None:
    """The data of the entry that is loaded, or being set up after a reload."""
    for entry in hass.config_entries.async_entries(DOMAIN):
        if entry.state in (
            ConfigEntryState.LOADED,
            ConfigEntryState.SETUP_IN_PROGRESS,
        ) and isinstance(getattr(entry, "runtime_data", None), FoodPlanningData):
            return entry.runtime_data
    return None


def _may_change_recipes(
    entry: FoodPlanningConfigEntry,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> bool:
    """Check the "only administrators change recipes" option; reply if not."""
    if not entry.options.get(CONF_ADMIN_ONLY, DEFAULT_ADMIN_ONLY):
        return True
    if connection.user.is_admin:
        return True
    connection.send_error(
        msg["id"],
        websocket_api.ERR_UNAUTHORIZED,
        "Only administrators can change or delete recipes",
    )
    return False


def _recipe_json(store: FoodPlanningStore, recipe: Recipe) -> dict[str, Any]:
    open_count, _bought = store.recipe_shopping_status(recipe)
    missing = (
        None
        if recipe.missing is None
        else [
            recipe.ingredients[i] for i in recipe.missing if i < len(recipe.ingredients)
        ]
    )
    if missing is None:
        status = None
    elif missing:
        status = "missing"
    else:
        status = "ready"
    return {
        # "ready": everything is at home; "missing": see "missing";
        # None: not checked yet. "on_list": items still to buy for it.
        "status": status,
        "missing": missing,
        "on_list": open_count,
        "uid": recipe.uid,
        "title": recipe.title,
        "servings": recipe.servings,
        "ingredients": recipe.ingredients,
        "steps": recipe.steps,
        "notes": recipe.notes,
        "source_url": recipe.source_url,
        "image_url": image_url(recipe.image) if recipe.image else recipe.image_url,
        "created": recipe.created,
        "categories": recipe.categories,
        "total_minutes": recipe.total_minutes,
    }


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/recipes/subscribe"})
@callback
def ws_subscribe_recipes(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Send all recipes now and again after every change.

    Follows whichever config entry is loaded, so the subscription keeps
    working when the integration is reloaded.
    """
    if not hass.config_entries.async_entries(DOMAIN):
        connection.send_error(msg["id"], "not_loaded", "Food Planning is not set up")
        return

    @callback
    def send_recipes() -> None:
        if (data := _current_data(hass)) is None:
            return
        store = data.store
        connection.send_message(
            websocket_api.event_message(
                msg["id"],
                {
                    "recipes": [_recipe_json(store, r) for r in store.recipes],
                    "categories": store.categories,
                },
            )
        )

    connection.subscriptions[msg["id"]] = async_dispatcher_connect(
        hass, SIGNAL_RECIPES_UPDATED, send_recipes
    )
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
    if not _may_change_recipes(entry, connection, msg):
        return
    if not await async_delete_recipe(hass, entry, msg["uid"]):
        connection.send_error(msg["id"], "not_found", "Recipe not found")
        return
    connection.send_result(msg["id"])


_TEXT_LIST = vol.All([vol.All(str, vol.Strip, vol.Length(min=1))])
_OPTIONAL_TEXT = vol.Any(None, vol.All(str, vol.Strip))


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/recipes/update",
        vol.Required("uid"): str,
        vol.Optional("title"): vol.All(str, vol.Strip, vol.Length(min=1)),
        vol.Optional("servings"): _OPTIONAL_TEXT,
        vol.Optional("ingredients"): _TEXT_LIST,
        vol.Optional("steps"): _TEXT_LIST,
        vol.Optional("notes"): _OPTIONAL_TEXT,
        vol.Optional("source_url"): _OPTIONAL_TEXT,
        vol.Optional("total_minutes"): vol.Any(
            None, vol.All(vol.Coerce(int), vol.Range(min=1, max=10080))
        ),
        vol.Optional("categories"): [str],
    }
)
@websocket_api.async_response
async def ws_update_recipe(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Save an edited recipe."""
    entry = _loaded_entry(hass)
    if entry is None:
        connection.send_error(msg["id"], "not_loaded", "Food Planning is not loaded")
        return
    if not _may_change_recipes(entry, connection, msg):
        return
    store = entry.runtime_data.store
    changes = {
        k: (v or None) if k in ("servings", "notes", "source_url") else v
        for k, v in msg.items()
        if k not in ("id", "type", "uid")
    }
    if store.update_recipe(msg["uid"], changes) is None:
        connection.send_error(msg["id"], "not_found", "Recipe not found")
        return
    await store.async_save()
    connection.send_result(msg["id"])


@websocket_api.websocket_command(
    {vol.Required("type"): f"{DOMAIN}/recipes/cooked", vol.Required("uid"): str}
)
@websocket_api.async_response
async def ws_mark_cooked(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Mark a recipe as cooked: clear "ready to cook", update the pantry."""
    entry = _loaded_entry(hass)
    if entry is None:
        connection.send_error(msg["id"], "not_loaded", "Food Planning is not loaded")
        return
    store = entry.runtime_data.store
    recipe = store.get_recipe(msg["uid"])
    if recipe is None:
        connection.send_error(msg["id"], "not_found", "Recipe not found")
        return
    recipe.on_shopping_list = False
    await store.async_save()
    connection.send_result(msg["id"])
    if entry.options.get(CONF_UPDATE_PANTRY, DEFAULT_UPDATE_PANTRY):
        entry.async_create_background_task(
            hass,
            async_consume_recipe(hass, entry, recipe),
            "food_planning pantry update",
        )


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/timers/subscribe"})
@callback
def ws_subscribe_timers(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Send the timers now and after every change.

    "now" is the server's clock, so the dashboards count down to "ends_at"
    correctly even if the device's clock is off.
    """
    if not hass.config_entries.async_entries(DOMAIN):
        connection.send_error(msg["id"], "not_loaded", "Food Planning is not set up")
        return

    @callback
    def send_timers() -> None:
        if (data := _current_data(hass)) is None:
            return
        manager = data.timers
        now = dt_util.utcnow()
        connection.send_message(
            websocket_api.event_message(
                msg["id"],
                {
                    "now": now.isoformat(),
                    "timers": [t.as_json(now) for t in manager.timers],
                },
            )
        )

    connection.subscriptions[msg["id"]] = async_dispatcher_connect(
        hass, SIGNAL_TIMERS_UPDATED, send_timers
    )
    connection.send_result(msg["id"])
    send_timers()


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/categories/set",
        vol.Required("categories"): [vol.All(str, vol.Strip, vol.Length(min=1))],
        vol.Optional("renames", default={}): {str: vol.All(str, vol.Strip)},
        vol.Optional("recategorize", default=False): bool,
    }
)
@websocket_api.async_response
async def ws_set_categories(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Save the category list; optionally have the AI re-pick every recipe's."""
    entry = _loaded_entry(hass)
    if entry is None:
        connection.send_error(msg["id"], "not_loaded", "Food Planning is not loaded")
        return
    if not _may_change_recipes(entry, connection, msg):
        return
    store = entry.runtime_data.store
    store.set_categories(msg["categories"], msg["renames"])
    await store.async_save()
    changed = 0
    if msg["recategorize"] and store.recipes:
        try:
            changed = await async_categorize_recipes(hass, entry, list(store.recipes))
        except HomeAssistantError as err:
            connection.send_error(msg["id"], "ai_failed", str(err))
            return
        await store.async_save()
    connection.send_result(msg["id"], {"changed": changed})
