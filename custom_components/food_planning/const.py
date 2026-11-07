"""Constants for the Food Planning integration."""

from __future__ import annotations

from typing import Final

DOMAIN: Final = "food_planning"

STORAGE_KEY: Final = DOMAIN
STORAGE_VERSION: Final = 1

CONF_AI_TASK_ENTITY: Final = "ai_task_entity"
CONF_LANGUAGE: Final = "language"
CONF_MERGE_SHOPPING: Final = "merge_shopping"
DEFAULT_LANGUAGE: Final = "Swedish"
DEFAULT_MERGE_SHOPPING: Final = True
CONF_UPDATE_PANTRY: Final = "update_pantry"
# Shown on the settings page, but stored with the recipes, not as an option.
CONF_CATEGORIES: Final = "categories"
DEFAULT_UPDATE_PANTRY: Final = True

SERVICE_IMPORT_RECIPE: Final = "import_recipe"
SERVICE_ADD_TO_SHOPPING_LIST: Final = "add_recipe_to_shopping_list"
SERVICE_MOVE_BOUGHT_TO_PANTRY: Final = "move_bought_to_pantry"
SERVICE_START_TIMER: Final = "start_timer"
SERVICE_PAUSE_TIMER: Final = "pause_timer"
SERVICE_RESUME_TIMER: Final = "resume_timer"
SERVICE_CANCEL_TIMER: Final = "cancel_timer"
SERVICE_EXTEND_TIMER: Final = "extend_timer"

ATTR_URL: Final = "url"
ATTR_TEXT: Final = "text"
ATTR_ADD_TO_SHOPPING_LIST: Final = "add_to_shopping_list"
ATTR_RECIPE: Final = "recipe"
ATTR_ONLY_MISSING: Final = "only_missing"
ATTR_INGREDIENTS: Final = "ingredients"
ATTR_DURATION: Final = "duration"
ATTR_LABEL: Final = "label"
ATTR_TIMER: Final = "timer"

# The recipe card, served by the integration and loaded on every dashboard.
FRONTEND_URL: Final = f"/{DOMAIN}/frontend"
CARD_FILENAME: Final = "food-planning-card.js"
# Recipe images saved at import, under /config/food_planning/images.
IMAGES_URL: Final = f"/{DOMAIN}/images"

# Entities from versions before the recipe card replaced them. Removed from
# the entity registry on setup so they don't linger as "unavailable".
REMOVED_ENTITIES: Final = (
    ("todo", "recipes"),
    ("text", "recipe_url"),
    ("select", "selected_recipe"),
    ("button", "import_recipe"),
    ("button", "add_to_shopping_list"),
)
