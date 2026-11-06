"""Recipe picker, used with the "add to shopping list" button."""

from __future__ import annotations

from homeassistant.components.select import SelectEntity
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
    """Set up the recipe picker."""
    async_add_entities([SelectedRecipe(entry)])


class SelectedRecipe(FoodPlanningEntity, SelectEntity):
    """Choose a recipe by title."""

    def __init__(self, entry: FoodPlanningConfigEntry) -> None:
        """Initialize the picker."""
        super().__init__(entry, "select", "selected_recipe")

    async def async_added_to_hass(self) -> None:
        """Update when an import selects the new recipe."""
        await super().async_added_to_hass()
        self.async_on_remove(
            self._data.async_add_ui_listener(self.async_write_ha_state)
        )

    def _titles(self) -> dict[str, str]:
        """Map a unique option label to each recipe uid."""
        labels: dict[str, str] = {}
        for recipe in self._data.store.recipes:
            label, n = recipe.title, 2
            while label in labels:
                label, n = f"{recipe.title} ({n})", n + 1
            labels[label] = recipe.uid
        return labels

    @property
    def options(self) -> list[str]:
        """Return recipe titles."""
        return list(self._titles())

    @property
    def current_option(self) -> str | None:
        """Return the selected recipe's title."""
        uid = self._data.selected_recipe_uid
        return next((label for label, u in self._titles().items() if u == uid), None)

    async def async_select_option(self, option: str) -> None:
        """Select a recipe."""
        self._data.selected_recipe_uid = self._titles().get(option)
        self._data.async_notify_ui()
