"""Fetches the selected stores' flyers and indexes the offers by product."""

from __future__ import annotations

import asyncio
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta
import logging
import math
from typing import TYPE_CHECKING, Any

from homeassistant.core import CALLBACK_TYPE, HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import async_call_later, async_track_time_change
from homeassistant.helpers.storage import Store
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed
from homeassistant.util import dt as dt_util

from ..const import (
    CONF_OFFERS_MIN_DISCOUNT,
    CONF_OFFERS_RADIUS,
    CONF_OFFERS_STORES,
    DEFAULT_OFFERS_MIN_DISCOUNT,
    DEFAULT_OFFERS_RADIUS,
    DOMAIN,
    SIGNAL_OFFERS_UPDATED,
    SIGNAL_RECIPES_UPDATED,
)
from ..offer_lookup import OfferHit
from .api import OffersApiError, TjekClient
from .models import Offer, parse_offer
from .naming import async_name_offers, heading_key

if TYPE_CHECKING:
    from ..data import FoodPlanningConfigEntry

_LOGGER = logging.getLogger(__name__)

STORAGE_KEY = f"{DOMAIN}.offers"
STORAGE_VERSION = 1
UPDATE_INTERVAL = timedelta(hours=6)
# ICA flyers go live at midnight, Willys' around 02:00; fetch after that.
MONDAY_FETCH = (2, 30)
# After a failed naming batch, try again after this long, doubling.
NAMING_RETRY = 600
MAX_NAMING_RETRY = 6 * 3600
# Offers named per AI call; small enough for a short model answer.
NAMING_BATCH = 40
STORE_LOOKUP_TIMEOUT = 10


def home_location(hass: HomeAssistant) -> tuple[float, float]:
    """zone.home, which is HA's configured location."""
    if (state := hass.states.get("zone.home")) is not None:
        lat, lng = state.attributes.get("latitude"), state.attributes.get("longitude")
        if lat is not None and lng is not None:
            return float(lat), float(lng)
    return hass.config.latitude, hass.config.longitude


def distance_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance."""
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(a))


def make_client(hass: HomeAssistant, radius_km: float) -> TjekClient:
    """A client centred on home."""
    lat, lng = home_location(hass)
    return TjekClient(async_get_clientsession(hass), lat, lng, int(radius_km * 1000))


@dataclass
class StoreInfo:
    """A selected store and its current flyer."""

    id: str
    title: str
    chain: str
    street: str = ""
    distance_km: float | None = None
    valid_from: str | None = None
    valid_until: str | None = None
    next_flyer_from: str | None = None
    # False when its flyer couldn't be fetched last time.
    ok: bool = True


@dataclass
class OffersData:
    """What the coordinator holds."""

    stores: dict[str, StoreInfo] = field(default_factory=dict)
    offers: list[Offer] = field(default_factory=list)
    fetched_at: str | None = None

    def current(self, store_id: str | None = None) -> list[Offer]:
        """Offers valid now, optionally at one store."""
        now = dt_util.utcnow()
        result = []
        for offer in self.offers:
            if store_id and offer.store_id != store_id:
                continue
            start = dt_util.parse_datetime(offer.valid_from)
            end = dt_util.parse_datetime(offer.valid_until)
            if (start is None or start <= now) and (end is None or now <= end):
                result.append(offer)
        return result


class OffersCoordinator(DataUpdateCoordinator[OffersData]):
    """Keeps the selected stores' current offers."""

    config_entry: FoodPlanningConfigEntry

    def __init__(self, hass: HomeAssistant, entry: FoodPlanningConfigEntry) -> None:
        """Initialize the coordinator."""
        super().__init__(
            hass,
            _LOGGER,
            config_entry=entry,
            name="Food Planning offers",
            update_interval=UPDATE_INTERVAL,
        )
        self._storage: Store[dict[str, Any]] = Store(
            hass, STORAGE_VERSION, STORAGE_KEY, private=True
        )
        options = entry.options
        self.store_ids: list[str] = list(options.get(CONF_OFFERS_STORES) or [])
        self.min_discount = int(
            options.get(CONF_OFFERS_MIN_DISCOUNT, DEFAULT_OFFERS_MIN_DISCOUNT)
        )
        self._radius = float(options.get(CONF_OFFERS_RADIUS, DEFAULT_OFFERS_RADIUS))
        # heading_key -> product names; [] for non-food.
        self.names: dict[str, list[str]] = {}
        self._index: dict[str, list[tuple[Offer, StoreInfo]]] = {}
        self._unsubs: list[CALLBACK_TYPE] = []
        self._naming_retry: CALLBACK_TYPE | None = None
        self._naming_delay = NAMING_RETRY

    async def async_load(self) -> None:
        """Start from the saved offers, so a restart needs no fetch."""
        saved = await self._storage.async_load() or {}
        self.names = {
            k: [n for n in v if isinstance(n, str)]
            for k, v in (saved.get("names") or {}).items()
            if isinstance(v, list)
        }
        stores = {
            sid: StoreInfo(
                **{k: v for k, v in info.items() if k in StoreInfo.__dataclass_fields__}
            )
            for sid, info in (saved.get("stores") or {}).items()
            if sid in self.store_ids and isinstance(info, dict)
        }
        offers = [
            Offer.from_dict(o)
            for o in saved.get("offers") or []
            if isinstance(o, dict) and o.get("store_id") in self.store_ids
        ]
        self.data = OffersData(
            stores=stores, offers=offers, fetched_at=saved.get("fetched_at")
        )
        self._rebuild_index()

    async def async_ensure_store_info(self) -> None:
        """Look up selected stores not saved yet, so entities get good names.

        Failures are fine: the next fetch fills them in.
        """
        missing = [sid for sid in self.store_ids if sid not in self.data.stores]
        if not missing:
            return
        client = make_client(self.hass, self._radius)
        try:
            # Setup waits for this; don't let a slow API hold it up.
            async with asyncio.timeout(STORE_LOOKUP_TIMEOUT):
                for store_id in missing:
                    try:
                        self.data.stores[store_id] = self._store_info(
                            store_id, await client.store(store_id)
                        )
                    except (OffersApiError, KeyError, TypeError, ValueError) as err:
                        _LOGGER.debug("Could not look up store %s: %s", store_id, err)
        except TimeoutError:
            _LOGGER.debug("Store lookup timed out; names come with the next fetch")

    def _store_info(self, store_id: str, raw: dict[str, Any]) -> StoreInfo:
        chain = str((raw.get("branding") or {}).get("name") or "")
        name = str(raw.get("name") or "")
        lat, lng = raw.get("latitude"), raw.get("longitude")
        return StoreInfo(
            id=store_id,
            title=name
            if name.casefold().startswith(chain.casefold())
            else f"{chain} {name}".strip(),
            chain=chain,
            street=str(raw.get("street") or ""),
            distance_km=round(
                distance_km(*home_location(self.hass), float(lat), float(lng)), 1
            )
            if lat is not None and lng is not None
            else None,
        )

    @callback
    def async_start(self) -> None:
        """Fetch now (in the background) and every Monday morning."""

        @callback
        def _monday(now: datetime) -> None:
            if dt_util.as_local(now).weekday() == 0:
                self.hass.async_create_task(self.async_refresh())

        self._unsubs.append(
            async_track_time_change(
                self.hass,
                _monday,
                hour=MONDAY_FETCH[0],
                minute=MONDAY_FETCH[1],
                second=0,
            )
        )
        self.config_entry.async_create_background_task(
            self.hass, self.async_refresh(), "food_planning offers fetch"
        )

    @callback
    def async_stop(self) -> None:
        """Stop the schedule (on unload)."""
        while self._unsubs:
            self._unsubs.pop()()
        if self._naming_retry:
            self._naming_retry()
            self._naming_retry = None

    async def _async_update_data(self) -> OffersData:
        """Fetch every selected store's current flyer.

        A store that fails keeps its last offers while they're valid; only
        when every store fails is the update a failure.
        """
        if not self.store_ids:
            return OffersData()
        client = make_client(self.hass, self._radius)
        previous = self.data or OffersData()
        stores: dict[str, StoreInfo] = {}
        offers: list[Offer] = []
        failures = 0
        now = dt_util.utcnow()
        for store_id in self.store_ids:
            info = previous.stores.get(store_id)
            try:
                if info is None:
                    info = self._store_info(store_id, await client.store(store_id))
                info = StoreInfo(**asdict(info))
                catalogs = await client.catalogs(store_id)
                running, upcoming = [], []
                for catalog in catalogs:
                    start = dt_util.parse_datetime(str(catalog.get("run_from") or ""))
                    end = dt_util.parse_datetime(str(catalog.get("run_till") or ""))
                    if start is None or end is None or end < now:
                        continue
                    (running if start <= now else upcoming).append(
                        (start, end, catalog)
                    )
                info.valid_from = (
                    min(s for s, _e, _c in running).isoformat() if running else None
                )
                info.valid_until = (
                    max(e for _s, e, _c in running).isoformat() if running else None
                )
                info.next_flyer_from = (
                    min(s for s, _e, _c in upcoming).isoformat() if upcoming else None
                )
                raw_offers = await client.offers(
                    [str(c["id"]) for _s, _e, c in running]
                )
                offers.extend(
                    o for r in raw_offers if (o := parse_offer(r, store_id)) is not None
                )
                info.ok = True
            except (OffersApiError, KeyError, TypeError, ValueError) as err:
                failures += 1
                _LOGGER.warning(
                    "Could not fetch offers for store %s: %s", store_id, err
                )
                if info is None:
                    continue
                info = StoreInfo(**asdict(info))
                info.ok = False
                offers.extend(previous.current(store_id))
            stores[store_id] = info
        if failures == len(self.store_ids):
            raise UpdateFailed("The flyer API could not be reached")
        data = OffersData(stores=stores, offers=offers, fetched_at=now.isoformat())
        # Drop names of offers that are gone; name the new ones.
        keys = {heading_key(o.heading, o.description) for o in offers}
        self.names = {k: v for k, v in self.names.items() if k in keys}
        await self._async_save(data)
        self._schedule_naming(0)
        return data

    @callback
    def _schedule_naming(self, delay: float) -> None:
        if self._naming_retry:
            self._naming_retry()
        self._naming_retry = async_call_later(self.hass, delay, self._start_naming)

    @callback
    def _start_naming(self, _now: datetime) -> None:
        self._naming_retry = None
        self.config_entry.async_create_background_task(
            self.hass, self._async_name(), "food_planning offer names"
        )

    async def _async_name(self) -> None:
        """Ask the AI for the product names of offers not named yet."""
        data = self.data
        if data is None:
            return
        todo: dict[str, tuple[str, str, str]] = {}
        for offer in data.offers:
            key = heading_key(offer.heading, offer.description)
            if key not in self.names:
                todo.setdefault(key, (key, offer.heading, offer.description))
        items = list(todo.values())
        # Batch by batch, so a failure keeps what was named and the
        # dashboards get matches as soon as the first batch is done.
        for start in range(0, len(items), NAMING_BATCH):
            batch = items[start : start + NAMING_BATCH]
            try:
                named = await async_name_offers(self.hass, self.config_entry, batch)
            except HomeAssistantError as err:
                _LOGGER.warning(
                    "Could not name offers, retrying in %d s: %s",
                    self._naming_delay,
                    err,
                )
                self._schedule_naming(self._naming_delay)
                self._naming_delay = min(self._naming_delay * 2, MAX_NAMING_RETRY)
                break
            # An offer the AI skipped matches nothing, and isn't asked again.
            self.names.update({key: named.get(key, []) for key, _h, _d in batch})
            await self._async_save(data)
            self._publish()
        else:
            self._naming_delay = NAMING_RETRY
        self._publish()

    @callback
    def _publish(self) -> None:
        self._rebuild_index()
        self.async_update_listeners()
        async_dispatcher_send(self.hass, SIGNAL_OFFERS_UPDATED)
        async_dispatcher_send(self.hass, SIGNAL_RECIPES_UPDATED)

    async def _async_save(self, data: OffersData) -> None:
        await self._storage.async_save(
            {
                "stores": {sid: asdict(info) for sid, info in data.stores.items()},
                "offers": [o.as_dict() for o in data.offers],
                "names": self.names,
                "fetched_at": data.fetched_at,
            }
        )

    async def async_remove_storage(self) -> None:
        """Delete the saved offers (when offers are turned off)."""
        await self._storage.async_remove()

    def _rebuild_index(self) -> None:
        index: dict[str, list[tuple[Offer, StoreInfo]]] = {}
        data = self.data
        if data is not None:
            for offer in data.offers:
                info = data.stores.get(offer.store_id)
                if info is None:
                    continue
                for name in self.names.get(
                    heading_key(offer.heading, offer.description), []
                ):
                    index.setdefault(name, []).append((offer, info))
        for hits in index.values():
            hits.sort(key=lambda h: (-(h[0].discount_percent or 0), h[0].unit_price))
        self._index = index

    # The core's OfferLookup

    def offers_for(self, product: str) -> list[OfferHit]:
        """Current offers for a product name, best discount first."""
        now = dt_util.utcnow()
        result = []
        for offer, info in self._index.get(product, []):
            end = dt_util.parse_datetime(offer.valid_until)
            start = dt_util.parse_datetime(offer.valid_from)
            if (end is None or now <= end) and (start is None or start <= now):
                result.append(offer.hit(info.title, info.chain))
        return result

    def product_names(self, offer: Offer) -> list[str]:
        """The product names an offer matches."""
        return self.names.get(heading_key(offer.heading, offer.description), [])
