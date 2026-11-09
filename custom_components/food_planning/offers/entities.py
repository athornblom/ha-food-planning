"""Offer sensors: one per selected store, and how the offers match your food."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any

from homeassistant.components.binary_sensor import (
    BinarySensorDeviceClass,
    BinarySensorEntity,
)
from homeassistant.components.sensor import SensorDeviceClass, SensorEntity
from homeassistant.const import EntityCategory
from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.entity import Entity
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.util import dt as dt_util, slugify

from ..const import DOMAIN
from ..offer_lookup import OfferHit, is_deal
from ..store import ALWAYS_AVAILABLE, PANTRY, SHOPPING
from .coordinator import OffersCoordinator

if TYPE_CHECKING:
    from ..data import FoodPlanningConfigEntry

MAX_PRODUCTS = 15
# Offers listed on a store's sensor; the rest come from get_offers.
MAX_STORE_OFFERS = 20


def offer_sensors(
    entry: FoodPlanningConfigEntry, coordinator: OffersCoordinator
) -> list[Entity]:
    """The offer sensors for the core's sensor platform."""
    entities: list[Entity] = [
        OfferMatchesSensor(entry, coordinator),
        ShoppingSavingsSensor(entry, coordinator),
        BestDealSensor(entry, coordinator),
    ]
    for store_id in coordinator.store_ids:
        entities.append(StoreOffersSensor(entry, coordinator, store_id))
        entities.append(FlyerValidSensor(entry, coordinator, store_id))
    return entities


def offer_binary_sensors(
    entry: FoodPlanningConfigEntry, coordinator: OffersCoordinator
) -> list[Entity]:
    """The offer binary sensors for the core's binary_sensor platform."""
    return [OffersSourceSensor(entry, coordinator)]


def your_offers(
    entry: FoodPlanningConfigEntry, coordinator: OffersCoordinator
) -> dict[str, tuple[OfferHit, set[str]]]:
    """Products of yours on offer: product -> (best offer, where it's from).

    Where: "shopping_list", "pantry", "weekly_dinners".
    """
    data = entry.runtime_data
    store = data.store
    texts: list[tuple[str, str]] = [
        (i.summary, "shopping_list") for i in store.open_items(SHOPPING)
    ]
    texts += [(i.summary, "pantry") for i in store.open_items(PANTRY)]
    for _dinner, recipe in data.planner.open_dinners():
        texts += [(t, "weekly_dinners") for t in recipe.ingredients]
    result: dict[str, tuple[OfferHit, set[str]]] = {}
    for text, where in texts:
        name = store.product_name(text)
        if not name or name == ALWAYS_AVAILABLE:
            continue
        if name in result:
            result[name][1].add(where)
        elif hits := coordinator.offers_for(name):
            result[name] = (hits[0], {where})
    return result


class _OfferEntity(CoordinatorEntity[OffersCoordinator]):
    """Shared setup: English entity_id, translated name."""

    _attr_has_entity_name = True

    def __init__(
        self,
        entry: FoodPlanningConfigEntry,
        coordinator: OffersCoordinator,
        platform: str,
        key: str,
        object_id: str | None = None,
    ) -> None:
        super().__init__(coordinator)
        self._entry = entry
        self._attr_translation_key = key
        self._attr_unique_id = f"{entry.entry_id}_{object_id or key}"
        self.entity_id = f"{platform}.{DOMAIN}_{object_id or key}"


class _YourOffersEntity(_OfferEntity, SensorEntity):
    """Also updates when the lists or recipes change."""

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        self.async_on_remove(
            self._entry.runtime_data.store.async_add_listener(self.async_write_ha_state)
        )

    def _yours(self) -> dict[str, tuple[OfferHit, set[str]]]:
        return your_offers(self._entry, self.coordinator)


class OfferMatchesSensor(_YourOffersEntity):
    """How many of your products are on offer at your stores."""

    _attr_native_unit_of_measurement = "st"

    def __init__(
        self, entry: FoodPlanningConfigEntry, coordinator: OffersCoordinator
    ) -> None:
        super().__init__(entry, coordinator, "sensor", "offer_matches")

    @property
    def native_value(self) -> int:
        return len(self._yours())

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        yours = self._yours()
        best = sorted(yours.items(), key=lambda p: -(p[1][0].discount_percent or 0))
        return {
            "shopping_list": sum("shopping_list" in w for _h, w in yours.values()),
            "pantry": sum("pantry" in w for _h, w in yours.values()),
            "weekly_dinners": sum("weekly_dinners" in w for _h, w in yours.values()),
            "deals": sum(
                is_deal(h, self.coordinator.min_discount) for h, _w in yours.values()
            ),
            "products": [
                {
                    "name": name,
                    "store": hit.store,
                    "price": hit.price,
                    "pieces": hit.pieces,
                    "discount_percent": hit.discount_percent,
                }
                for name, (hit, _w) in best[:MAX_PRODUCTS]
            ],
        }


class ShoppingSavingsSensor(_YourOffersEntity):
    """Kronor saved on the shopping list, from discounts the flyers state.

    A floor: offers without a stated ordinary price count as nothing.
    """

    _attr_device_class = SensorDeviceClass.MONETARY
    _attr_native_unit_of_measurement = "SEK"

    def __init__(
        self, entry: FoodPlanningConfigEntry, coordinator: OffersCoordinator
    ) -> None:
        super().__init__(entry, coordinator, "sensor", "shopping_savings")

    def _items(self) -> list[OfferHit]:
        return [h for h, w in self._yours().values() if "shopping_list" in w]

    @property
    def native_value(self) -> float:
        return round(sum(h.saving or 0 for h in self._items()), 2)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        items = self._items()
        known = sum(h.saving is not None for h in items)
        return {
            "items_with_discount": known,
            "items_unknown_discount": len(items) - known,
        }


class BestDealSensor(_YourOffersEntity):
    """Your product with the biggest known discount."""

    def __init__(
        self, entry: FoodPlanningConfigEntry, coordinator: OffersCoordinator
    ) -> None:
        super().__init__(entry, coordinator, "sensor", "best_deal")

    def _best(self) -> tuple[str, OfferHit] | None:
        deals = [
            (name, hit)
            for name, (hit, _w) in self._yours().items()
            if hit.discount_percent is not None
        ]
        return max(deals, key=lambda d: d[1].discount_percent or 0, default=None)

    @property
    def native_value(self) -> str | None:
        if (best := self._best()) is None:
            return None
        name, hit = best
        return f"{name.capitalize()} −{hit.discount_percent} %"

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        if (best := self._best()) is None:
            return {}
        name, hit = best
        return {
            "product": name,
            "store": hit.store,
            "price": hit.price,
            "pieces": hit.pieces,
            "ordinary_price": hit.ordinary_price,
            "discount_percent": hit.discount_percent,
            "member": hit.member,
            "valid_until": hit.valid_until,
        }


class _StoreEntity(_OfferEntity):
    """An entity on a store's own device."""

    def __init__(
        self,
        entry: FoodPlanningConfigEntry,
        coordinator: OffersCoordinator,
        store_id: str,
        key: str,
    ) -> None:
        info = coordinator.data.stores.get(store_id) if coordinator.data else None
        title = info.title if info else store_id
        super().__init__(entry, coordinator, "sensor", key, f"{key}_{slugify(title)}")
        self._attr_unique_id = f"{entry.entry_id}_{key}_{store_id}"
        self._store_id = store_id
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, f"store_{store_id}")},
            name=title,
            manufacturer=info.chain if info else None,
            entry_type=DeviceEntryType.SERVICE,
        )

    @property
    def _info(self):
        return (
            self.coordinator.data.stores.get(self._store_id)
            if self.coordinator.data
            else None
        )

    @property
    def available(self) -> bool:
        info = self._info
        return super().available and info is not None and info.ok


class StoreOffersSensor(_StoreEntity, SensorEntity):
    """How many offers a store has right now, and the biggest discounts.

    Only the top offers are listed (attributes are limited in size); all of
    them come from the get_offers action.
    """

    _attr_native_unit_of_measurement = "st"
    _unrecorded_attributes = frozenset({"top_offers"})

    def __init__(
        self,
        entry: FoodPlanningConfigEntry,
        coordinator: OffersCoordinator,
        store_id: str,
    ) -> None:
        super().__init__(entry, coordinator, store_id, "offers")

    @property
    def native_value(self) -> int | None:
        if self.coordinator.data is None:
            return None
        return len(self.coordinator.data.current(self._store_id))

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        info = self._info
        if info is None or self.coordinator.data is None:
            return {}
        offers = self.coordinator.data.current(self._store_id)
        discounts = [
            o.discount_percent for o in offers if o.discount_percent is not None
        ]
        return {
            "store": info.title,
            "chain": info.chain,
            "address": info.street,
            "distance_km": info.distance_km,
            "valid_from": info.valid_from,
            "valid_until": info.valid_until,
            "member_offers": sum(o.member for o in offers),
            "with_discount": len(discounts),
            "max_discount_percent": max(discounts, default=None),
            "fetched_at": self.coordinator.data.fetched_at,
            "top_offers": [
                {
                    "name": o.heading,
                    "price": o.price,
                    "pieces": o.pieces,
                    "quantity": o.quantity,
                    "ordinary_price": o.ordinary_price,
                    "discount_percent": o.discount_percent,
                    "member": o.member,
                }
                for o in sorted(
                    offers, key=lambda o: (-(o.discount_percent or 0), o.unit_price)
                )[:MAX_STORE_OFFERS]
            ],
        }


class FlyerValidSensor(_StoreEntity, SensorEntity):
    """When a store's current flyer ends."""

    _attr_device_class = SensorDeviceClass.TIMESTAMP

    def __init__(
        self,
        entry: FoodPlanningConfigEntry,
        coordinator: OffersCoordinator,
        store_id: str,
    ) -> None:
        super().__init__(entry, coordinator, store_id, "flyer_valid_until")

    @property
    def native_value(self) -> datetime | None:
        info = self._info
        return (
            dt_util.parse_datetime(info.valid_until)
            if info and info.valid_until
            else None
        )

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        info = self._info
        return {"next_flyer_from": info.next_flyer_from if info else None}


class OffersSourceSensor(_OfferEntity, BinarySensorEntity):
    """Off when the flyer API couldn't be reached on the last fetch."""

    _attr_device_class = BinarySensorDeviceClass.CONNECTIVITY
    _attr_entity_category = EntityCategory.DIAGNOSTIC

    def __init__(
        self, entry: FoodPlanningConfigEntry, coordinator: OffersCoordinator
    ) -> None:
        super().__init__(entry, coordinator, "binary_sensor", "offers_source")

    @property
    def available(self) -> bool:
        return True

    @property
    def is_on(self) -> bool:
        return self.coordinator.last_update_success
