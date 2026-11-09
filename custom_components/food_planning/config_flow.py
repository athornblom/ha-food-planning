"""Config flow for the Food Planning integration."""

from __future__ import annotations

import asyncio
from typing import Any

import voluptuous as vol

from homeassistant.config_entries import (
    ConfigEntry,
    ConfigEntryState,
    ConfigFlow,
    ConfigFlowResult,
    OptionsFlow,
)
from homeassistant.core import callback
from homeassistant.data_entry_flow import section
from homeassistant.helpers.selector import (
    BooleanSelector,
    EntitySelector,
    EntitySelectorConfig,
    NumberSelector,
    NumberSelectorConfig,
    NumberSelectorMode,
    SelectOptionDict,
    SelectSelector,
    SelectSelectorConfig,
    SelectSelectorMode,
    TextSelector,
    TextSelectorConfig,
    TimeSelector,
)

from .const import (
    CONF_ADMIN_ONLY,
    CONF_AI_TASK_ENTITY,
    CONF_CATEGORIES,
    CONF_LANGUAGE,
    CONF_MERGE_SHOPPING,
    CONF_OFFERS,
    CONF_OFFERS_MIN_DISCOUNT,
    CONF_OFFERS_RADIUS,
    CONF_OFFERS_STORES,
    CONF_SORT_SHOPPING,
    CONF_UPDATE_PANTRY,
    CONF_WEEKLY,
    CONF_WEEKLY_COUNT,
    CONF_WEEKLY_DAY,
    CONF_WEEKLY_IDEAS,
    CONF_WEEKLY_TIME,
    DEFAULT_ADMIN_ONLY,
    DEFAULT_LANGUAGE,
    DEFAULT_MERGE_SHOPPING,
    DEFAULT_OFFERS,
    DEFAULT_OFFERS_MIN_DISCOUNT,
    DEFAULT_OFFERS_RADIUS,
    DEFAULT_SORT_SHOPPING,
    DEFAULT_UPDATE_PANTRY,
    DEFAULT_WEEKLY,
    DEFAULT_WEEKLY_COUNT,
    DEFAULT_WEEKLY_DAY,
    DEFAULT_WEEKLY_IDEAS,
    DEFAULT_WEEKLY_TIME,
    DOMAIN,
    WEEKDAYS,
)

# Only imported here, to list nearby stores; the core never uses it.
from .offers.api import OffersApiError
from .offers.coordinator import distance_km, home_location, make_client

WEEKLY_KEYS = (
    CONF_WEEKLY,
    CONF_WEEKLY_DAY,
    CONF_WEEKLY_TIME,
    CONF_WEEKLY_COUNT,
    CONF_WEEKLY_IDEAS,
)
OFFERS_KEYS = (
    CONF_OFFERS,
    CONF_OFFERS_RADIUS,
    CONF_OFFERS_MIN_DISCOUNT,
    CONF_OFFERS_STORES,
)
OPTIONS_SCHEMA = vol.Schema(
    {
        # Empty means: use the AI task entity chosen as preferred in
        # Settings > System > General.
        vol.Optional(CONF_AI_TASK_ENTITY): EntitySelector(
            EntitySelectorConfig(domain="ai_task")
        ),
        vol.Required(CONF_LANGUAGE, default=DEFAULT_LANGUAGE): TextSelector(),
        vol.Required(
            CONF_MERGE_SHOPPING, default=DEFAULT_MERGE_SHOPPING
        ): BooleanSelector(),
        vol.Required(
            CONF_SORT_SHOPPING, default=DEFAULT_SORT_SHOPPING
        ): BooleanSelector(),
        vol.Required(
            CONF_UPDATE_PANTRY, default=DEFAULT_UPDATE_PANTRY
        ): BooleanSelector(),
        vol.Required(CONF_ADMIN_ONLY, default=DEFAULT_ADMIN_ONLY): BooleanSelector(),
    }
)
SECTION_WEEKLY = "weekly"
SECTION_OFFERS = "offers_section"
STORES_TIMEOUT = 15
WEEKLY_SCHEMA = vol.Schema(
    {
        vol.Required(CONF_WEEKLY, default=DEFAULT_WEEKLY): BooleanSelector(),
        vol.Required(CONF_WEEKLY_DAY, default=DEFAULT_WEEKLY_DAY): SelectSelector(
            SelectSelectorConfig(
                options=list(WEEKDAYS),
                translation_key="weekday",
                mode=SelectSelectorMode.DROPDOWN,
            )
        ),
        vol.Required(CONF_WEEKLY_TIME, default=DEFAULT_WEEKLY_TIME): TimeSelector(),
        vol.Required(CONF_WEEKLY_COUNT, default=DEFAULT_WEEKLY_COUNT): vol.All(
            NumberSelector(
                NumberSelectorConfig(min=1, max=10, step=1, mode=NumberSelectorMode.BOX)
            ),
            vol.Coerce(int),
        ),
        vol.Required(
            CONF_WEEKLY_IDEAS, default=DEFAULT_WEEKLY_IDEAS
        ): BooleanSelector(),
    }
)
OFFERS_SCHEMA = vol.Schema(
    {
        vol.Required(CONF_OFFERS, default=DEFAULT_OFFERS): BooleanSelector(),
        vol.Required(CONF_OFFERS_RADIUS, default=DEFAULT_OFFERS_RADIUS): NumberSelector(
            NumberSelectorConfig(
                min=0.5,
                max=25,
                step=0.5,
                unit_of_measurement="km",
                mode=NumberSelectorMode.BOX,
            )
        ),
        vol.Required(
            CONF_OFFERS_MIN_DISCOUNT, default=DEFAULT_OFFERS_MIN_DISCOUNT
        ): vol.All(
            NumberSelector(
                NumberSelectorConfig(
                    min=0,
                    max=80,
                    step=1,
                    unit_of_measurement="%",
                    mode=NumberSelectorMode.BOX,
                )
            ),
            vol.Coerce(int),
        ),
    }
)


class FoodPlanningConfigFlow(ConfigFlow, domain=DOMAIN):
    """Set up Food Planning. Only one instance is allowed (see manifest)."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Ask which AI task entity and language to use."""
        if user_input is not None:
            return self.async_create_entry(
                title="Food Planning", data={}, options=user_input
            )
        return self.async_show_form(step_id="user", data_schema=OPTIONS_SCHEMA)

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        """Return the options flow."""
        return FoodPlanningOptionsFlow()


class FoodPlanningOptionsFlow(OptionsFlow):
    """All settings on one page; Veckans middagar and offers in sections."""

    def __init__(self) -> None:
        """Initialize the flow."""
        # Radius the store list was fetched for; a new radius fetches again.
        self._stores_radius: float | None = None

    async def _store_options(
        self, radius: float, selected: list[str]
    ) -> tuple[list[SelectOptionDict], bool]:
        """Stores near home as "Chain – street (0,8 km)", nearest first.

        Returns the options and whether the flyer API answered.
        """
        ok = True
        found: list[tuple[float, Any]] = []
        try:
            async with asyncio.timeout(STORES_TIMEOUT):
                stores = await make_client(self.hass, radius).grocery_stores()
            home = home_location(self.hass)
            found = sorted(
                ((distance_km(*home, s.latitude, s.longitude), s) for s in stores),
                key=lambda d: d[0],
            )
        except (OffersApiError, TimeoutError):
            ok = False
        options = [
            SelectOptionDict(
                value=s.id,
                label=f"{s.title} – {s.street} ({km:.1f} km)".replace(".", ","),
            )
            for km, s in found
        ]
        known = {o["value"] for o in options}
        # Keep stores picked earlier, also when outside the radius or offline.
        options += [
            SelectOptionDict(value=sid, label=sid)
            for sid in selected
            if sid not in known
        ]
        return options, ok

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Show the settings. Saving reloads the integration.

        The recipe categories live with the recipes (in the integration's
        storage), not in the options, so they're only shown while loaded.
        """
        store = (
            self.config_entry.runtime_data.store
            if self.config_entry.state is ConfigEntryState.LOADED
            else None
        )
        current = dict(self.config_entry.options)
        if user_input is not None:
            values = dict(user_input)
            for key in (SECTION_WEEKLY, SECTION_OFFERS):
                values |= values.pop(key, {})
            radius = float(values.get(CONF_OFFERS_RADIUS, DEFAULT_OFFERS_RADIUS))
            if values.get(CONF_OFFERS) and radius != self._stores_radius:
                # The store list was for another radius: show it again.
                return await self._async_show(store, current | values)
            if store is not None and CONF_CATEGORIES in values:
                store.set_categories(values.pop(CONF_CATEGORIES).splitlines())
                await store.async_save()
            return self.async_create_entry(data=current | values)
        return await self._async_show(store, current)

    async def _async_show(self, store: Any, values: dict[str, Any]) -> ConfigFlowResult:
        radius = float(values.get(CONF_OFFERS_RADIUS, DEFAULT_OFFERS_RADIUS))
        selected = list(values.get(CONF_OFFERS_STORES) or [])
        store_options, ok = await self._store_options(radius, selected)
        self._stores_radius = radius
        offers_schema = OFFERS_SCHEMA.extend(
            {
                vol.Optional(CONF_OFFERS_STORES, default=[]): SelectSelector(
                    SelectSelectorConfig(
                        options=store_options,
                        multiple=True,
                        mode=SelectSelectorMode.LIST,
                    )
                )
            }
        )
        fields: dict[Any, Any] = dict(OPTIONS_SCHEMA.schema)
        suggested = dict(values)
        if store is not None:
            fields[vol.Optional(CONF_CATEGORIES)] = TextSelector(
                TextSelectorConfig(multiline=True)
            )
            suggested.setdefault(CONF_CATEGORIES, "\n".join(store.categories))
        fields[vol.Required(SECTION_WEEKLY)] = section(
            WEEKLY_SCHEMA, {"collapsed": not values.get(CONF_WEEKLY, DEFAULT_WEEKLY)}
        )
        fields[vol.Required(SECTION_OFFERS)] = section(
            offers_schema, {"collapsed": not values.get(CONF_OFFERS, DEFAULT_OFFERS)}
        )
        suggested[SECTION_WEEKLY] = {k: values[k] for k in WEEKLY_KEYS if k in values}
        suggested[SECTION_OFFERS] = {k: values[k] for k in OFFERS_KEYS if k in values}
        return self.async_show_form(
            step_id="init",
            data_schema=self.add_suggested_values_to_schema(
                vol.Schema(fields), suggested
            ),
            errors=None if ok else {"base": "cannot_fetch_stores"},
            description_placeholders={"count": str(len(store_options))},
        )
