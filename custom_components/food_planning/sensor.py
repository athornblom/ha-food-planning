"""Sensors: cooking timers, recipes and Veckans middagar.

Everything is worked out from data the integration already has; no
sensor calls the AI or the internet. Optional modules add their own
sensors through the runtime data's entity hooks.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
from homeassistant.helpers.event import async_track_time_change
from homeassistant.util import dt as dt_util

from .data import FoodPlanningConfigEntry, async_add_hooked_entities
from .entity import FoodPlanningEntity
from .images import image_url
from .timers import STATUS_FINISHED, STATUS_RUNNING
from .weekly import QUICK_MINUTES

PARALLEL_UPDATES = 0
MAX_TITLES = 20
MAX_ITEMS = 30


async def async_setup_entry(
    hass: HomeAssistant,
    entry: FoodPlanningConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up the sensors."""
    entities: list[SensorEntity] = [
        NextTimerSensor(entry),
        RecipesSensor(entry),
        ReadyRecipesSensor(entry),
        LastCookedSensor(entry),
    ]
    if entry.runtime_data.planner.enabled:
        entities += [
            WeeklyDinnersSensor(entry),
            DinnerTonightSensor(entry),
            WeekToBuySensor(entry),
        ]
    async_add_entities(entities)
    async_add_hooked_entities(entry, "sensor", async_add_entities)


class NextTimerSensor(FoodPlanningEntity, SensorEntity):
    """The end time of the running timer that ends first.

    Unknown when no timer is running. The "timers" attribute lists all
    timers (running, paused and finished-but-not-dismissed).
    """

    _attr_device_class = SensorDeviceClass.TIMESTAMP

    def __init__(self, entry: FoodPlanningConfigEntry) -> None:
        """Initialize the sensor."""
        super().__init__(entry, "sensor", "next_timer")

    async def async_added_to_hass(self) -> None:
        """Update whenever the timers change."""
        self.async_on_remove(
            self._data.timers.async_add_listener(self.async_write_ha_state)
        )

    @property
    def native_value(self) -> datetime | None:
        """Return when the next timer ends."""
        return self._data.timers.next_end()

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return all timers, soonest first."""
        now = dt_util.utcnow()
        timers = sorted(
            self._data.timers.timers,
            key=lambda t: (t.status != STATUS_FINISHED, t.seconds_left(now)),
        )
        nxt = next((t for t in timers if t.status == STATUS_RUNNING), None)
        return {
            "label": nxt.label if nxt else None,
            "recipe": nxt.recipe if nxt else None,
            "timers": [t.as_json(now) for t in timers],
        }


class RecipesSensor(FoodPlanningEntity, SensorEntity):
    """How many recipes there are, per category."""

    _attr_native_unit_of_measurement = "st"

    def __init__(self, entry: FoodPlanningConfigEntry) -> None:
        """Initialize the sensor."""
        super().__init__(entry, "sensor", "recipes")

    @property
    def native_value(self) -> int:
        """Return the number of recipes."""
        return len(self._data.store.recipes)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return counts per category, quick ones and the newest."""
        store = self._data.store
        return {
            "categories": {
                c: sum(c in r.categories for r in store.recipes)
                for c in store.categories
            },
            "quick": sum(
                bool(r.total_minutes and r.total_minutes <= QUICK_MINUTES)
                for r in store.recipes
            ),
            "latest": store.recipes[0].title if store.recipes else None,
        }


class ReadyRecipesSensor(FoodPlanningEntity, SensorEntity):
    """Recipes that can be cooked with what's at home."""

    _attr_native_unit_of_measurement = "st"

    def __init__(self, entry: FoodPlanningConfigEntry) -> None:
        """Initialize the sensor."""
        super().__init__(entry, "sensor", "ready_recipes")

    @property
    def native_value(self) -> int:
        """Return how many recipes have everything at home."""
        return sum(r.missing == [] for r in self._data.store.recipes)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return their titles, and those missing one or two things."""
        recipes = self._data.store.recipes
        return {
            "recipes": [r.title for r in recipes if r.missing == []][:MAX_TITLES],
            "almost_ready": [
                r.title for r in recipes if r.missing and len(r.missing) <= 2
            ][:MAX_TITLES],
        }


class LastCookedSensor(FoodPlanningEntity, SensorEntity):
    """When a recipe was last marked as cooked, and which."""

    _attr_device_class = SensorDeviceClass.TIMESTAMP

    def __init__(self, entry: FoodPlanningConfigEntry) -> None:
        """Initialize the sensor."""
        super().__init__(entry, "sensor", "last_cooked")

    @property
    def native_value(self) -> datetime | None:
        """Return when."""
        cooked = self._data.store.cooked
        return dt_util.parse_datetime(cooked[-1]["at"]) if cooked else None

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return the recipe, and how many were cooked this week."""
        store = self._data.store
        if not store.cooked:
            return {}
        last = store.cooked[-1]
        recipe = store.get_recipe(last["uid"])
        today = dt_util.start_of_local_day()
        monday = today - timedelta(days=today.weekday())
        return {
            "title": recipe.title if recipe else None,
            "uid": last["uid"],
            "cooked_this_week": sum(
                (at := dt_util.parse_datetime(c["at"])) is not None and at >= monday
                for c in store.cooked
            ),
        }


class WeeklyDinnersSensor(FoodPlanningEntity, SensorEntity):
    """Veckans middagar: how many of the week's dinners are left to cook."""

    _attr_native_unit_of_measurement = "st"

    def __init__(self, entry: FoodPlanningConfigEntry) -> None:
        """Initialize the sensor."""
        super().__init__(entry, "sensor", "weekly_dinners")

    @property
    def native_value(self) -> int | None:
        """Return dinners left, or unknown before the week is planned."""
        plan = self._data.planner.as_json()
        return plan["left"] if plan else None

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return the week and its dinners (a few small rows)."""
        plan = self._data.planner.as_json()
        if plan is None:
            return {}
        return {
            "week": plan["week"],
            "created": plan["created"],
            "dinners": [
                {
                    "title": d["title"],
                    "uid": d["recipe_uid"],
                    "reason": d["reason"],
                    "cooked": d["cooked"],
                    "pinned": d["pinned"],
                    "added_by_you": d["added"],
                    "rolled_over": d["rolled_over"],
                    "idea": d["idea"],
                    "ready": d.get("missing") == [],
                    "missing": len(d.get("missing") or []),
                    "on_offer": len(d.get("deals") or []),
                }
                for d in plan["dinners"]
            ],
        }


class DinnerTonightSensor(FoodPlanningEntity, SensorEntity):
    """The best of the week's open dinners for today."""

    def __init__(self, entry: FoodPlanningConfigEntry) -> None:
        """Initialize the sensor."""
        super().__init__(entry, "sensor", "dinner_tonight")

    async def async_added_to_hass(self) -> None:
        """Also update at midnight: weekdays prefer quick dinners."""
        await super().async_added_to_hass()

        @callback
        def _midnight(_now: datetime) -> None:
            self.async_write_ha_state()

        self.async_on_remove(
            async_track_time_change(self.hass, _midnight, hour=0, minute=0, second=5)
        )

    @property
    def native_value(self) -> str | None:
        """Return the recipe title."""
        recipe = self._data.planner.tonight()
        return recipe.title if recipe else None

    @property
    def entity_picture(self) -> str | None:
        """Return the recipe's picture."""
        recipe = self._data.planner.tonight()
        if recipe is None:
            return None
        return image_url(recipe.image) if recipe.image else recipe.image_url

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return details for cards and Assist."""
        recipe = self._data.planner.tonight()
        if recipe is None:
            return {}
        missing = recipe.missing
        return {
            "uid": recipe.uid,
            "total_minutes": recipe.total_minutes,
            "ready": missing == [],
            "missing": None
            if missing is None
            else [
                recipe.ingredients[i] for i in missing if i < len(recipe.ingredients)
            ],
            "left_this_week": len(self._data.planner.open_dinners()),
        }


class WeekToBuySensor(FoodPlanningEntity, SensorEntity):
    """Ingredients still to buy for the week's dinners, not on the list yet."""

    _attr_native_unit_of_measurement = "st"

    def __init__(self, entry: FoodPlanningConfigEntry) -> None:
        """Initialize the sensor."""
        super().__init__(entry, "sensor", "week_to_buy")

    @property
    def native_value(self) -> int:
        """Return how many."""
        return len(self._data.planner.to_buy())

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return the items."""
        return {"items": self._data.planner.to_buy()[:MAX_ITEMS]}
