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
    DEFAULT_ADMIN_ONLY,
    DOMAIN,
    SIGNAL_OFFERS_UPDATED,
    SIGNAL_RECIPES_UPDATED,
    SIGNAL_TIMERS_UPDATED,
)
from .data import (
    FoodPlanningConfigEntry,
    FoodPlanningData,
    async_delete_recipe,
    async_mark_cooked,
)
from .images import image_url
from .offer_lookup import OfferLookup, is_deal
from .store import (
    ALWAYS_AVAILABLE,
    PANTRY,
    SHOPPING,
    FoodPlanningStore,
    Recipe,
    name_key,
)

# Offers shown per ingredient or item: the best and one alternative.
OFFERS_PER_ITEM = 2
MAX_REFILL = 5


@callback
def async_setup_websocket(hass: HomeAssistant) -> None:
    """Register the websocket commands."""
    websocket_api.async_register_command(hass, ws_subscribe_recipes)
    websocket_api.async_register_command(hass, ws_delete_recipe)
    websocket_api.async_register_command(hass, ws_update_recipe)
    websocket_api.async_register_command(hass, ws_mark_cooked)
    websocket_api.async_register_command(hass, ws_subscribe_timers)
    websocket_api.async_register_command(hass, ws_set_categories)
    websocket_api.async_register_command(hass, ws_update_week)
    websocket_api.async_register_command(hass, ws_subscribe_item_offers)


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


def _offers_json(
    store: FoodPlanningStore, lookup: OfferLookup | None, text: str
) -> list[dict[str, Any]] | None:
    """The best offers for an ingredient or item's product, if any."""
    if lookup is None:
        return None
    name = store.product_name(text)
    if not name or name == ALWAYS_AVAILABLE:
        return None
    hits = lookup.offers_for(name)[:OFFERS_PER_ITEM]
    if not hits:
        return None
    return [hit.as_json() | {"deal": is_deal(hit, lookup.min_discount)} for hit in hits]


def _recipe_json(
    store: FoodPlanningStore, recipe: Recipe, lookup: OfferLookup | None = None
) -> dict[str, Any]:
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
        "last_cooked": store.last_cooked(recipe.uid),
        # Ingredient index (as text) -> offers, only for those on offer.
        "offers": {
            str(i): offers
            for i, text in enumerate(recipe.ingredients)
            if (offers := _offers_json(store, lookup, text))
        },
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
        lookup = data.offers
        connection.send_message(
            websocket_api.event_message(
                msg["id"],
                {
                    "recipes": [_recipe_json(store, r, lookup) for r in store.recipes],
                    "week": data.planner.as_json() if data.planner.enabled else None,
                    "weekly_enabled": data.planner.enabled,
                    "offers_enabled": lookup is not None,
                    "categories": store.categories,
                    "category_descriptions": {
                        c: store.category_description(c) for c in store.categories
                    },
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
    """Mark a recipe as cooked: clear "ready to cook", tick it off the
    week, update the pantry."""
    entry = _loaded_entry(hass)
    if entry is None:
        connection.send_error(msg["id"], "not_loaded", "Food Planning is not loaded")
        return
    recipe = entry.runtime_data.store.get_recipe(msg["uid"])
    if recipe is None:
        connection.send_error(msg["id"], "not_found", "Recipe not found")
        return
    await async_mark_cooked(hass, entry, recipe)
    connection.send_result(msg["id"])


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
        vol.Optional("descriptions"): {str: vol.All(str, vol.Strip)},
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
    store.set_categories(msg["categories"], msg["renames"], msg.get("descriptions"))
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


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/week/update",
        vol.Required("action"): vol.In(
            ["plan", "swap", "remove", "pin", "unpin", "add", "shop"]
        ),
        vol.Optional("uid"): str,
    }
)
@websocket_api.async_response
async def ws_update_week(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Change Veckans middagar: everything the user does on the plan.

    "uid" is a recipe uid, or an idea's title for swap and remove.
    """
    entry = _loaded_entry(hass)
    if entry is None:
        connection.send_error(msg["id"], "not_loaded", "Food Planning is not loaded")
        return
    data = entry.runtime_data
    planner = data.planner
    action, key = msg["action"], msg.get("uid", "")
    result: dict[str, Any] = {}
    if action == "plan":
        try:
            await planner.async_plan()
        except HomeAssistantError as err:
            connection.send_error(msg["id"], "plan_failed", str(err))
            return
        connection.send_result(msg["id"], {"added": planner.last_added})
        return
    if action == "shop":
        added = planner.add_to_shopping()
        data.mergers[SHOPPING].async_schedule(item.uid for item in added)
        result["added"] = len(added)
    elif action == "add":
        if (recipe := data.store.get_recipe(key)) is None:
            connection.send_error(msg["id"], "not_found", "Recipe not found")
            return
        planner.add(recipe)
    elif action == "remove":
        planner.remove(key)
    elif action == "swap":
        new = planner.swap(key)
        result["recipe_uid"] = new.recipe_uid if new else None
    else:
        planner.pin(key, action == "pin")
    await data.store.async_save()
    connection.send_result(msg["id"], result)


@websocket_api.websocket_command(
    {vol.Required("type"): f"{DOMAIN}/offers/items/subscribe"}
)
@callback
def ws_subscribe_item_offers(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Offers for the shopping list and At home items, for the list cards.

    "items" maps an item's text (see name_key) to its offers. "refill"
    lists At home items with a real discount, best first.
    """
    if not hass.config_entries.async_entries(DOMAIN):
        connection.send_error(msg["id"], "not_loaded", "Food Planning is not set up")
        return

    @callback
    def send_offers() -> None:
        if (data := _current_data(hass)) is None:
            return
        store, lookup = data.store, data.offers
        items: dict[str, list[dict[str, Any]]] = {}
        refill: list[dict[str, Any]] = []
        if lookup is not None:
            for list_name in (SHOPPING, PANTRY):
                for item in store.open_items(list_name):
                    key = name_key(item.summary)
                    if key in items:
                        continue
                    if offers := _offers_json(store, lookup, item.summary):
                        items[key] = offers
                        if list_name == PANTRY and offers[0]["deal"]:
                            refill.append({"summary": item.summary, "offer": offers[0]})
            refill.sort(key=lambda r: -(r["offer"]["discount_percent"] or 0))
        connection.send_message(
            websocket_api.event_message(
                msg["id"],
                {
                    "enabled": lookup is not None,
                    "items": items,
                    "refill": refill[:MAX_REFILL],
                },
            )
        )

    unsubs = [
        async_dispatcher_connect(hass, SIGNAL_RECIPES_UPDATED, send_offers),
        async_dispatcher_connect(hass, SIGNAL_OFFERS_UPDATED, send_offers),
    ]

    @callback
    def unsubscribe() -> None:
        for unsub in unsubs:
            unsub()

    connection.subscriptions[msg["id"]] = unsubscribe
    connection.send_result(msg["id"])
    send_offers()
