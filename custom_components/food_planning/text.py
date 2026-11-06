"""Text box on the dashboard for pasting a recipe link."""

from __future__ import annotations

from homeassistant.components.text import TextEntity, TextMode
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .data import FoodPlanningConfigEntry
from .entity import FoodPlanningEntity

PARALLEL_UPDATES = 0


async def async_setup_entry(
    hass: HomeAssistant,
    entry: FoodPlanningConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up the link input."""
    async_add_entities([RecipeUrlText(entry)])


class RecipeUrlText(FoodPlanningEntity, TextEntity):
    """Holds the link to import until the import button is pressed."""

    _attr_mode = TextMode.TEXT
    _attr_native_min = 0
    # A text entity's value is its state, which HA caps at 255 characters.
    _attr_native_max = 255

    def __init__(self, entry: FoodPlanningConfigEntry) -> None:
        """Initialize the input."""
        super().__init__(entry, "text", "recipe_url")

    async def async_added_to_hass(self) -> None:
        """Update when the import clears the input."""
        await super().async_added_to_hass()
        self.async_on_remove(
            self._data.async_add_ui_listener(self.async_write_ha_state)
        )

    @property
    def native_value(self) -> str:
        """Return the current link."""
        return self._data.url_input

    async def async_set_value(self, value: str) -> None:
        """Store a pasted link."""
        self._data.url_input = value.strip()
        self._data.async_notify_ui()
