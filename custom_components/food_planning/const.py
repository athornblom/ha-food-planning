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
CONF_SORT_SHOPPING: Final = "sort_shopping"
DEFAULT_SORT_SHOPPING: Final = True
CONF_ADMIN_ONLY: Final = "admin_only"
DEFAULT_ADMIN_ONLY: Final = False

CONF_WEEKLY: Final = "weekly_dinners"
DEFAULT_WEEKLY: Final = True
CONF_WEEKLY_DAY: Final = "weekly_day"
DEFAULT_WEEKLY_DAY: Final = "mon"
CONF_WEEKLY_TIME: Final = "weekly_time"
DEFAULT_WEEKLY_TIME: Final = "07:00:00"
CONF_WEEKLY_COUNT: Final = "weekly_count"
DEFAULT_WEEKLY_COUNT: Final = 5
CONF_WEEKLY_IDEAS: Final = "weekly_new_ideas"
DEFAULT_WEEKLY_IDEAS: Final = False
WEEKDAYS: Final = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")

CONF_OFFERS: Final = "offers"
DEFAULT_OFFERS: Final = False
CONF_OFFERS_RADIUS: Final = "offers_radius"
DEFAULT_OFFERS_RADIUS: Final = 3.0
CONF_OFFERS_STORES: Final = "offers_stores"
CONF_OFFERS_MIN_DISCOUNT: Final = "offers_min_discount"
DEFAULT_OFFERS_MIN_DISCOUNT: Final = 10

# Sent after the recipes/lists or the timers change, by whichever config
# entry is loaded, so open dashboards keep updating across reloads.
SIGNAL_RECIPES_UPDATED: Final = f"{DOMAIN}_recipes_updated"
SIGNAL_TIMERS_UPDATED: Final = f"{DOMAIN}_timers_updated"
# Sent when the offers were fetched or their product names changed.
SIGNAL_OFFERS_UPDATED: Final = f"{DOMAIN}_offers_updated"

SERVICE_IMPORT_RECIPE: Final = "import_recipe"
SERVICE_ADD_TO_SHOPPING_LIST: Final = "add_recipe_to_shopping_list"
SERVICE_MOVE_BOUGHT_TO_PANTRY: Final = "move_bought_to_pantry"
SERVICE_START_TIMER: Final = "start_timer"
SERVICE_PAUSE_TIMER: Final = "pause_timer"
SERVICE_RESUME_TIMER: Final = "resume_timer"
SERVICE_CANCEL_TIMER: Final = "cancel_timer"
SERVICE_EXTEND_TIMER: Final = "extend_timer"
SERVICE_MARK_COOKED: Final = "mark_cooked"
SERVICE_PLAN_WEEK: Final = "plan_week"
SERVICE_GET_WEEKLY_DINNERS: Final = "get_weekly_dinners"
SERVICE_ADD_TO_WEEK: Final = "add_to_week"
SERVICE_REMOVE_FROM_WEEK: Final = "remove_from_week"
SERVICE_ADD_WEEK_TO_SHOPPING_LIST: Final = "add_week_to_shopping_list"
SERVICE_GET_OFFERS: Final = "get_offers"
SERVICE_SEARCH_OFFERS: Final = "search_offers"

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
