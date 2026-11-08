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
    TextSelector,
    TextSelectorConfig,
)

from .const import (
    CONF_ADMIN_ONLY,
    CONF_AI_TASK_ENTITY,
    CONF_CATEGORIES,
    CONF_LANGUAGE,
    CONF_MERGE_SHOPPING,
    CONF_SORT_SHOPPING,
    CONF_UPDATE_PANTRY,
    DEFAULT_ADMIN_ONLY,
    DEFAULT_LANGUAGE,
    DEFAULT_MERGE_SHOPPING,
    DEFAULT_SORT_SHOPPING,
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
            CONF_SORT_SHOPPING, default=DEFAULT_SORT_SHOPPING
        ): BooleanSelector(),
        vol.Required(
            CONF_UPDATE_PANTRY, default=DEFAULT_UPDATE_PANTRY
        ): BooleanSelector(),
        vol.Required(CONF_ADMIN_ONLY, default=DEFAULT_ADMIN_ONLY): BooleanSelector(),
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
    """Settings: AI task entity, language, AI features and recipe categories."""

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
            return self.async_create_entry(data=user_input)

        schema = OPTIONS_SCHEMA
        suggested = dict(self.config_entry.options)
        if store is not None:
            schema = OPTIONS_SCHEMA.extend(
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
