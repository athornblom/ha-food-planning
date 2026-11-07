"""Cooking timers, kept by the integration so every device shows the same.

A timer counts down to an end time. The recipe card shows it on every open
dashboard; the event entity fires when one starts, finishes or is cancelled
(for automations), and the sensor shows when the next one ends. Timers are
stored, so they survive closing the browser and restarting Home Assistant.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta
import logging
from typing import Any
from uuid import uuid4

from homeassistant.core import CALLBACK_TYPE, HomeAssistant, callback
from homeassistant.helpers.event import async_track_point_in_utc_time
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

TIMERS_STORAGE_KEY = f"{DOMAIN}.timers"
TIMERS_STORAGE_VERSION = 1

STATUS_RUNNING = "running"
STATUS_PAUSED = "paused"
STATUS_FINISHED = "finished"

EVENT_STARTED = "started"
EVENT_PAUSED = "paused"
EVENT_RESUMED = "resumed"
EVENT_FINISHED = "finished"
EVENT_CANCELLED = "cancelled"
EVENT_TYPES = [
    EVENT_STARTED,
    EVENT_PAUSED,
    EVENT_RESUMED,
    EVENT_FINISHED,
    EVENT_CANCELLED,
]

# Finished timers stay (ringing on the dashboards) until dismissed, at most
# this long. A timer that ended longer ago than this while Home Assistant
# was down is dropped without a "finished" event.
FINISHED_KEEP = timedelta(minutes=15)
MAX_DURATION = timedelta(hours=24)

type TimerEventListener = Callable[[str, Timer], None]


@dataclass
class Timer:
    """One countdown."""

    label: str
    duration: float  # seconds, as set (plus added time)
    recipe: str | None = None  # recipe title
    recipe_uid: str | None = None
    # Running: when it ends. Finished: when it ended. Paused: None.
    ends_at: str | None = None
    remaining: float | None = None  # seconds left, while paused
    status: str = STATUS_RUNNING
    id: str = field(default_factory=lambda: uuid4().hex)

    @property
    def end(self) -> datetime | None:
        """The end time as a datetime."""
        return dt_util.parse_datetime(self.ends_at) if self.ends_at else None

    def seconds_left(self, now: datetime) -> float:
        """Seconds until it ends (0 when finished)."""
        if self.status == STATUS_PAUSED:
            return self.remaining or 0.0
        if self.status == STATUS_FINISHED or (end := self.end) is None:
            return 0.0
        return max(0.0, (end - now).total_seconds())

    def as_event_data(self) -> dict[str, Any]:
        """Attributes sent with the timer's events."""
        return {
            "timer_id": self.id,
            "label": self.label,
            "recipe": self.recipe,
            "duration": round(self.duration),
        }

    def as_json(self, now: datetime) -> dict[str, Any]:
        """For the sensor's attribute and the dashboards."""
        return {
            "id": self.id,
            "label": self.label,
            "recipe": self.recipe,
            "recipe_uid": self.recipe_uid,
            "status": self.status,
            "duration": round(self.duration),
            "ends_at": self.ends_at,
            "remaining": round(self.seconds_left(now)),
        }


def _discard(items: list[Any], item: Any) -> None:
    if item in items:
        items.remove(item)


class TimerManager:
    """Keeps the timers, ends them on time and tells the entities."""

    def __init__(self, hass: HomeAssistant) -> None:
        """Initialize the manager."""
        self._hass = hass
        self._store: Store[dict[str, Any]] = Store(
            hass, TIMERS_STORAGE_VERSION, TIMERS_STORAGE_KEY, private=True
        )
        self.timers: list[Timer] = []
        self._unsub: dict[str, CALLBACK_TYPE] = {}
        self._listeners: list[Callable[[], None]] = []
        self._event_listeners: list[TimerEventListener] = []

    async def async_load(self) -> None:
        """Load stored timers and catch up on any that ended meanwhile.

        Event listeners aren't registered yet, so timers that ended while
        Home Assistant was down are finished once the entities are added
        (see async_start).
        """
        data = await self._store.async_load() or {}
        names = set(Timer.__dataclass_fields__)
        self.timers = [
            Timer(**{k: v for k, v in item.items() if k in names})
            for item in data.get("timers", [])
            if isinstance(item, dict) and item.get("label")
        ]

    @callback
    def async_start(self) -> None:
        """Schedule the loaded timers. Call once the entities are listening."""
        now = dt_util.utcnow()
        changed = False
        for timer in list(self.timers):
            end = timer.end
            if timer.status == STATUS_RUNNING and end is not None and end <= now:
                if now - end > FINISHED_KEEP:
                    self.timers.remove(timer)
                    changed = True
                else:
                    # Ended during the restart: still let automations know.
                    self._finish(timer)
                    changed = True
            elif timer.status == STATUS_FINISHED and (
                end is None or now - end > FINISHED_KEEP
            ):
                self.timers.remove(timer)
                changed = True
            else:
                self._schedule(timer)
        if changed:
            self._save_and_notify()

    @callback
    def async_stop(self) -> None:
        """Cancel the scheduled callbacks (on unload)."""
        for unsub in self._unsub.values():
            unsub()
        self._unsub.clear()

    async def async_remove(self) -> None:
        """Delete the stored timers (when the integration is removed)."""
        await self._store.async_remove()

    # Listeners ------------------------------------------------------------

    @callback
    def async_add_listener(self, listener: Callable[[], None]) -> CALLBACK_TYPE:
        """Call listener after every change. Returns a remove function."""
        self._listeners.append(listener)
        return lambda: _discard(self._listeners, listener)

    @callback
    def async_add_event_listener(self, listener: TimerEventListener) -> CALLBACK_TYPE:
        """Call listener(event_type, timer) for each timer event."""
        self._event_listeners.append(listener)
        return lambda: _discard(self._event_listeners, listener)

    def _emit(self, event_type: str, timer: Timer) -> None:
        for listener in list(self._event_listeners):
            listener(event_type, timer)

    def _save_and_notify(self) -> None:
        self._store.async_delay_save(
            lambda: {"timers": [asdict(t) for t in self.timers]}, 1.0
        )
        for listener in list(self._listeners):
            listener()

    # Queries --------------------------------------------------------------

    def get(self, timer_id: str) -> Timer | None:
        """Return a timer by ID."""
        return next((t for t in self.timers if t.id == timer_id), None)

    def find(self, key: str) -> list[Timer]:
        """Timers matching an ID or a label (case-insensitive)."""
        if timer := self.get(key):
            return [timer]
        folded = key.strip().casefold()
        return [t for t in self.timers if t.label.casefold() == folded]

    def next_end(self) -> datetime | None:
        """When the next running timer ends."""
        ends = [t.end for t in self.timers if t.status == STATUS_RUNNING and t.end]
        return min(ends) if ends else None

    # Actions --------------------------------------------------------------

    @callback
    def start(
        self,
        duration: timedelta,
        label: str,
        *,
        recipe: str | None = None,
        recipe_uid: str | None = None,
    ) -> Timer:
        """Start a new timer."""
        duration = min(max(duration, timedelta(seconds=1)), MAX_DURATION)
        timer = Timer(
            label=label.strip() or "Timer",
            duration=duration.total_seconds(),
            recipe=recipe,
            recipe_uid=recipe_uid,
            ends_at=(dt_util.utcnow() + duration).isoformat(),
        )
        self.timers.append(timer)
        self._schedule(timer)
        self._save_and_notify()
        self._emit(EVENT_STARTED, timer)
        return timer

    @callback
    def pause(self, timer: Timer) -> bool:
        """Pause a running timer."""
        if timer.status != STATUS_RUNNING:
            return False
        timer.remaining = timer.seconds_left(dt_util.utcnow())
        timer.ends_at = None
        timer.status = STATUS_PAUSED
        self._unschedule(timer)
        self._save_and_notify()
        self._emit(EVENT_PAUSED, timer)
        return True

    @callback
    def resume(self, timer: Timer) -> bool:
        """Continue a paused timer."""
        if timer.status != STATUS_PAUSED:
            return False
        timer.ends_at = (
            dt_util.utcnow() + timedelta(seconds=timer.remaining or 0)
        ).isoformat()
        timer.remaining = None
        timer.status = STATUS_RUNNING
        self._schedule(timer)
        self._save_and_notify()
        self._emit(EVENT_RESUMED, timer)
        return True

    @callback
    def add_time(self, timer: Timer, extra: timedelta) -> None:
        """Add time to a timer. A finished one starts again with the extra time."""
        now = dt_util.utcnow()
        timer.duration += extra.total_seconds()
        if timer.status == STATUS_PAUSED:
            timer.remaining = (timer.remaining or 0) + extra.total_seconds()
        elif timer.status == STATUS_FINISHED:
            timer.status = STATUS_RUNNING
            timer.ends_at = (now + extra).isoformat()
            self._schedule(timer)
            self._emit(EVENT_RESUMED, timer)
        else:
            timer.ends_at = ((timer.end or now) + extra).isoformat()
            self._schedule(timer)
        self._save_and_notify()

    @callback
    def cancel(self, timer: Timer) -> None:
        """Remove a timer. Dismissing a finished one fires no event."""
        self._unschedule(timer)
        if timer in self.timers:
            self.timers.remove(timer)
        self._save_and_notify()
        if timer.status != STATUS_FINISHED:
            self._emit(EVENT_CANCELLED, timer)

    # Scheduling -----------------------------------------------------------

    def _schedule(self, timer: Timer) -> None:
        self._unschedule(timer)
        if timer.status == STATUS_RUNNING and (end := timer.end):

            @callback
            def _ended(_now: datetime) -> None:
                self._unsub.pop(timer.id, None)
                if timer in self.timers and timer.status == STATUS_RUNNING:
                    self._finish(timer)
                    self._save_and_notify()

            self._unsub[timer.id] = async_track_point_in_utc_time(
                self._hass, _ended, end
            )
        elif timer.status == STATUS_FINISHED and (end := timer.end):
            # Clear it off the dashboards if nobody dismisses it.
            @callback
            def _expire(_now: datetime) -> None:
                self._unsub.pop(timer.id, None)
                if timer in self.timers and timer.status == STATUS_FINISHED:
                    self.timers.remove(timer)
                    self._save_and_notify()

            self._unsub[timer.id] = async_track_point_in_utc_time(
                self._hass, _expire, end + FINISHED_KEEP
            )

    def _unschedule(self, timer: Timer) -> None:
        if unsub := self._unsub.pop(timer.id, None):
            unsub()

    def _finish(self, timer: Timer) -> None:
        """Mark a timer finished and fire its event."""
        timer.status = STATUS_FINISHED
        timer.remaining = None
        if timer.ends_at is None:
            timer.ends_at = dt_util.utcnow().isoformat()
        self._schedule(timer)
        _LOGGER.debug("Timer finished: %s", timer.label)
        self._emit(EVENT_FINISHED, timer)
