"""Config flow for the Food Planning integration."""

from __future__ import annotations

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
# Settings page only: which features to set up in the next steps.
FEATURES_SCHEMA = vol.Schema(
    {
        vol.Required(CONF_WEEKLY, default=DEFAULT_WEEKLY): BooleanSelector(),
        vol.Required(CONF_OFFERS, default=DEFAULT_OFFERS): BooleanSelector(),
    }
)
WEEKLY_SCHEMA = vol.Schema(
    {
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
    """Settings: general, then Veckans middagar and offers when turned on."""

    def __init__(self) -> None:
        """Initialize the flow."""
        self._options: dict[str, Any] = {}

    def _suggested(self, schema: vol.Schema) -> vol.Schema:
        return self.add_suggested_values_to_schema(
            schema, dict(self.config_entry.options) | self._options
        )

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Show the settings. Options are read when used, so no reload.

        The recipe categories live with the recipes (in the integration's
        storage), not in the options, so they're only shown while loaded.
        """
        store = (
            self.config_entry.runtime_data.store
            if self.config_entry.state is ConfigEntryState.LOADED
            else None
        )
        if user_input is not None:
            if store is not None and CONF_CATEGORIES in user_input:
                store.set_categories(user_input.pop(CONF_CATEGORIES).splitlines())
                await store.async_save()
            self._options = dict(self.config_entry.options) | user_input
            return await self._async_next("init")

        schema = OPTIONS_SCHEMA.extend(FEATURES_SCHEMA.schema)
        suggested = dict(self.config_entry.options)
        if store is not None:
            schema = schema.extend(
                {
                    vol.Optional(CONF_CATEGORIES): TextSelector(
                        TextSelectorConfig(multiline=True)
                    )
                }
            )
            suggested[CONF_CATEGORIES] = "\n".join(store.categories)
        return self.async_show_form(
            step_id="init",
            data_schema=self.add_suggested_values_to_schema(schema, suggested),
        )

    async def _async_next(self, done: str) -> ConfigFlowResult:
        """The next step for the features turned on, or save."""
        steps = ["init"]
        if self._options.get(CONF_WEEKLY, DEFAULT_WEEKLY):
            steps.append("weekly")
        if self._options.get(CONF_OFFERS, DEFAULT_OFFERS):
            steps.append("offers")
        following = steps[steps.index(done) + 1 :] if done in steps else []
        if not following:
            return self.async_create_entry(data=self._options)
        return await getattr(self, f"async_step_{following[0]}")()

    async def async_step_weekly(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """When and how many dinners to suggest each week."""
        if user_input is not None:
            self._options |= user_input
            return await self._async_next("weekly")
        return self.async_show_form(
            step_id="weekly", data_schema=self._suggested(WEEKLY_SCHEMA)
        )

    async def async_step_offers(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """How far from home to look for stores, and what counts as a deal."""
        if user_input is not None:
            self._options |= user_input
            return await self.async_step_stores()
        return self.async_show_form(
            step_id="offers", data_schema=self._suggested(OFFERS_SCHEMA)
        )

    async def async_step_stores(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Pick stores near home: "Chain – street (0,8 km)"."""
        if user_input is not None:
            self._options[CONF_OFFERS_STORES] = user_input.get(
                CONF_OFFERS_STORES, self._options.get(CONF_OFFERS_STORES) or []
            )
            return await self._async_next("offers")
        radius = float(self._options.get(CONF_OFFERS_RADIUS, DEFAULT_OFFERS_RADIUS))
        selected = list(self._options.get(CONF_OFFERS_STORES) or [])
        try:
            stores = await make_client(self.hass, radius).grocery_stores()
        except OffersApiError:
            return self.async_show_form(
                step_id="stores",
                data_schema=vol.Schema({}),
                errors={"base": "cannot_fetch_stores"},
                description_placeholders={"count": "0"},
            )
        home = home_location(self.hass)
        found = sorted(
            ((distance_km(*home, s.latitude, s.longitude), s) for s in stores),
            key=lambda d: d[0],
        )
        options = [
            SelectOptionDict(
                value=s.id,
                label=f"{s.title} – {s.street} ({km:.1f} km)".replace(".", ","),
            )
            for km, s in found
        ]
        known = {o["value"] for o in options}
        # Keep stores picked earlier that are now outside the radius.
        options += [
            SelectOptionDict(value=sid, label=sid)
            for sid in selected
            if sid not in known
        ]
        schema = vol.Schema(
            {
                vol.Optional(CONF_OFFERS_STORES, default=selected): SelectSelector(
                    SelectSelectorConfig(
                        options=options, multiple=True, mode=SelectSelectorMode.LIST
                    )
                )
            }
        )
        return self.async_show_form(
            step_id="stores",
            data_schema=schema,
            description_placeholders={"count": str(len(found))},
        )
