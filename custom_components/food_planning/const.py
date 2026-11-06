"""Constants for the Food Planning integration."""

from __future__ import annotations

from typing import Final

DOMAIN: Final = "food_planning"

STORAGE_KEY: Final = DOMAIN
STORAGE_VERSION: Final = 1

CONF_AI_TASK_ENTITY: Final = "ai_task_entity"
CONF_LANGUAGE: Final = "language"
DEFAULT_LANGUAGE: Final = "Swedish"

SERVICE_IMPORT_RECIPE: Final = "import_recipe"
SERVICE_ADD_TO_SHOPPING_LIST: Final = "add_recipe_to_shopping_list"

ATTR_URL: Final = "url"
ATTR_TEXT: Final = "text"
ATTR_ADD_TO_SHOPPING_LIST: Final = "add_to_shopping_list"
ATTR_RECIPE: Final = "recipe"

# Headings used when a recipe is rendered into a to-do item description,
# and recognised again when the user edits that description by hand.
HEADING_INGREDIENTS: Final = "Ingredienser"
HEADING_STEPS: Final = "Gör så här"
LABEL_SOURCE: Final = "Källa"
INGREDIENT_HEADINGS: Final = frozenset({"ingredienser", "ingredients"})
STEP_HEADINGS: Final = frozenset(
    {"gör så här", "instruktioner", "tillagning", "steps", "instructions", "method"}
)
