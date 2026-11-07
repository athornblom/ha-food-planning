"""Actions (services) for the Food Planning integration."""

from __future__ import annotations

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

from .const import (
    ATTR_ADD_TO_SHOPPING_LIST,
    ATTR_DURATION,
    ATTR_INGREDIENTS,
    ATTR_LABEL,
    ATTR_ONLY_MISSING,
    ATTR_RECIPE,
    ATTR_TEXT,
    ATTR_TIMER,
    ATTR_URL,
    DOMAIN,
    SERVICE_ADD_TO_SHOPPING_LIST,
    SERVICE_CANCEL_TIMER,
    SERVICE_EXTEND_TIMER,
    SERVICE_IMPORT_RECIPE,
    SERVICE_MOVE_BOUGHT_TO_PANTRY,
    SERVICE_PAUSE_TIMER,
    SERVICE_RESUME_TIMER,
    SERVICE_START_TIMER,
)
from .data import (
    FoodPlanningConfigEntry,
    async_add_recipe_to_shopping,
    async_import_recipe,
    async_move_bought_to_pantry,
)
from .timers import Timer, TimerManager

IMPORT_SCHEMA = vol.All(
    vol.Schema(
        {
            vol.Exclusive(ATTR_URL, "source"): cv.url,
            vol.Exclusive(ATTR_TEXT, "source"): cv.string,
            vol.Optional(ATTR_ADD_TO_SHOPPING_LIST, default=False): cv.boolean,
        }
    ),
    cv.has_at_least_one_key(ATTR_URL, ATTR_TEXT),
)
ADD_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_RECIPE): cv.string,
        vol.Optional(ATTR_ONLY_MISSING, default=False): cv.boolean,
        vol.Optional(ATTR_INGREDIENTS): vol.All(cv.ensure_list, [cv.string]),
    }
)

START_TIMER_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_DURATION): cv.positive_time_period,
        vol.Optional(ATTR_LABEL, default=""): cv.string,
        vol.Optional(ATTR_RECIPE): cv.string,
    }
)
# Without "timer", the action applies to all timers.
TIMER_SCHEMA = vol.Schema({vol.Optional(ATTR_TIMER): cv.string})
EXTEND_TIMER_SCHEMA = vol.Schema(
    {
        vol.Optional(ATTR_TIMER): cv.string,
        vol.Required(ATTR_DURATION): cv.positive_time_period,
    }
)


def _loaded_entry(hass: HomeAssistant) -> FoodPlanningConfigEntry:
    for entry in hass.config_entries.async_entries(DOMAIN):
        if entry.state is ConfigEntryState.LOADED:
            return entry
    raise ServiceValidationError(
        translation_domain=DOMAIN, translation_key="not_loaded"
    )


@callback
def async_setup_services(hass: HomeAssistant) -> None:
    """Register the integration's actions."""

    async def import_recipe(call: ServiceCall) -> ServiceResponse:
        entry = _loaded_entry(hass)
        recipe = await async_import_recipe(
            hass,
            entry,
            url=call.data.get(ATTR_URL),
            text=call.data.get(ATTR_TEXT),
            add_to_shopping_list=call.data[ATTR_ADD_TO_SHOPPING_LIST],
        )
        if not call.return_response:
            return None
        return {
            "uid": recipe.uid,
            "title": recipe.title,
            "servings": recipe.servings,
            "ingredients": recipe.ingredients,
            "steps": recipe.steps,
            "notes": recipe.notes,
            "source_url": recipe.source_url,
            "image_url": recipe.image_url,
        }

    async def add_to_shopping_list(call: ServiceCall) -> ServiceResponse:
        entry = _loaded_entry(hass)
        store = entry.runtime_data.store
        recipe = store.find_recipe(call.data[ATTR_RECIPE])
        if recipe is None:
            raise ServiceValidationError(
                translation_domain=DOMAIN,
                translation_key="recipe_not_found",
                translation_placeholders={"recipe": call.data[ATTR_RECIPE]},
            )
        added = async_add_recipe_to_shopping(
            entry,
            recipe,
            only_missing=call.data[ATTR_ONLY_MISSING],
            ingredients=call.data.get(ATTR_INGREDIENTS),
        )
        await store.async_save()
        return {"added": added} if call.return_response else None

    async def move_bought_to_pantry(call: ServiceCall) -> ServiceResponse:
        moved = await async_move_bought_to_pantry(_loaded_entry(hass))
        return {"moved": moved} if call.return_response else None

    def _timers() -> TimerManager:
        return _loaded_entry(hass).runtime_data.timers

    def _targets(manager: TimerManager, call: ServiceCall) -> list[Timer]:
        """The timers an action applies to: by ID or label, or all."""
        if (key := call.data.get(ATTR_TIMER)) is None:
            return list(manager.timers)
        if not (found := manager.find(key)):
            raise ServiceValidationError(
                translation_domain=DOMAIN,
                translation_key="timer_not_found",
                translation_placeholders={"timer": key},
            )
        return found

    async def start_timer(call: ServiceCall) -> ServiceResponse:
        entry = _loaded_entry(hass)
        recipe = None
        if key := call.data.get(ATTR_RECIPE):
            recipe = entry.runtime_data.store.find_recipe(key)
            if recipe is None:
                raise ServiceValidationError(
                    translation_domain=DOMAIN,
                    translation_key="recipe_not_found",
                    translation_placeholders={"recipe": key},
                )
        timer = entry.runtime_data.timers.start(
            call.data[ATTR_DURATION],
            call.data[ATTR_LABEL] or (recipe.title if recipe else ""),
            recipe=recipe.title if recipe else None,
            recipe_uid=recipe.uid if recipe else None,
        )
        return {"timer_id": timer.id} if call.return_response else None

    async def pause_timer(call: ServiceCall) -> None:
        manager = _timers()
        for timer in _targets(manager, call):
            manager.pause(timer)

    async def resume_timer(call: ServiceCall) -> None:
        manager = _timers()
        for timer in _targets(manager, call):
            manager.resume(timer)

    async def cancel_timer(call: ServiceCall) -> None:
        manager = _timers()
        for timer in _targets(manager, call):
            manager.cancel(timer)

    async def extend_timer(call: ServiceCall) -> None:
        manager = _timers()
        for timer in _targets(manager, call):
            manager.add_time(timer, call.data[ATTR_DURATION])

    hass.services.async_register(
        DOMAIN,
        SERVICE_START_TIMER,
        start_timer,
        schema=START_TIMER_SCHEMA,
        supports_response=SupportsResponse.OPTIONAL,
    )
    for name, handler in (
        (SERVICE_PAUSE_TIMER, pause_timer),
        (SERVICE_RESUME_TIMER, resume_timer),
        (SERVICE_CANCEL_TIMER, cancel_timer),
    ):
        hass.services.async_register(DOMAIN, name, handler, schema=TIMER_SCHEMA)
    hass.services.async_register(
        DOMAIN, SERVICE_EXTEND_TIMER, extend_timer, schema=EXTEND_TIMER_SCHEMA
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_MOVE_BOUGHT_TO_PANTRY,
        move_bought_to_pantry,
        supports_response=SupportsResponse.OPTIONAL,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_IMPORT_RECIPE,
        import_recipe,
        schema=IMPORT_SCHEMA,
        supports_response=SupportsResponse.OPTIONAL,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_ADD_TO_SHOPPING_LIST,
        add_to_shopping_list,
        schema=ADD_SCHEMA,
        supports_response=SupportsResponse.OPTIONAL,
    )
