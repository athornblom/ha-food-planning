"""Config flow for the Food Planning integration."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import (
    ConfigEntry,
    ConfigFlow,
    ConfigFlowResult,
    OptionsFlow,
)
from homeassistant.core import callback
from homeassistant.helpers.selector import (
    BooleanSelector,
    EntitySelector,
    EntitySelectorConfig,
    TextSelector,
)

from .const import (
    CONF_AI_TASK_ENTITY,
    CONF_LANGUAGE,
    CONF_MERGE_SHOPPING,
    CONF_UPDATE_PANTRY,
    DEFAULT_LANGUAGE,
    DEFAULT_MERGE_SHOPPING,
    DEFAULT_UPDATE_PANTRY,
    DOMAIN,
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
            CONF_UPDATE_PANTRY, default=DEFAULT_UPDATE_PANTRY
        ): BooleanSelector(),
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
    """Change the AI task entity or language later."""

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Show the options form. Options are read at import time, no reload."""
        if user_input is not None:
            return self.async_create_entry(data=user_input)
        return self.async_show_form(
            step_id="init",
            data_schema=self.add_suggested_values_to_schema(
                OPTIONS_SCHEMA, self.config_entry.options
            ),
        )
