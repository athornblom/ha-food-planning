"""Dashboard buttons: import the pasted link, add a recipe to the list."""

from __future__ import annotations

from homeassistant.components.button import ButtonEntity
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .const import DOMAIN
from .data import FoodPlanningConfigEntry, async_import_recipe
from .entity import FoodPlanningEntity

PARALLEL_UPDATES = 1


async def async_setup_entry(
    hass: HomeAssistant,
    entry: FoodPlanningConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up the buttons."""
    async_add_entities([ImportRecipeButton(entry), AddToShoppingListButton(entry)])


class ImportRecipeButton(FoodPlanningEntity, ButtonEntity):
    """Import the recipe at the link in the text box."""

    def __init__(self, entry: FoodPlanningConfigEntry) -> None:
        """Initialize the button."""
        super().__init__(entry, "button", "import_recipe")
        self._entry = entry

    async def async_press(self) -> None:
        """Import, then clear the text box. Errors show up as a toast."""
        url = self._data.url_input
        if not url:
            raise ServiceValidationError(
                translation_domain=DOMAIN, translation_key="missing_input"
            )
        await async_import_recipe(self.hass, self._entry, url=url)
        self._data.url_input = ""
        self._data.async_notify_ui()


class AddToShoppingListButton(FoodPlanningEntity, ButtonEntity):
    """Add the selected recipe's ingredients to the shopping list."""

    def __init__(self, entry: FoodPlanningConfigEntry) -> None:
        """Initialize the button."""
        super().__init__(entry, "button", "add_to_shopping_list")

    async def async_press(self) -> None:
        """Add the ingredients, skipping ones already on the list."""
        store = self._data.store
        uid = self._data.selected_recipe_uid
        recipe = store.get_recipe(uid) if uid else None
        if recipe is None:
            raise ServiceValidationError(
                translation_domain=DOMAIN, translation_key="no_recipe_selected"
            )
        store.add_recipe_to_shopping(recipe)
        await store.async_save()
