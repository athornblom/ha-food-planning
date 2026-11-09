"""Client for Tjek's flyer API, the backend of eReklamblad.

Unofficial and undocumented, no API key. Grocery chains publish their
weekly flyers there; ICA, Willys, Hemköp and Coop per store.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
import logging
from typing import Any

import aiohttp

_LOGGER = logging.getLogger(__name__)

BASE_URL = "https://api.etilbudsavis.dk/v2/"
HEADERS = {
    "User-Agent": (
        "ha-food-planning (+https://github.com/athornblom/ha-food-planning)"
    ),
    "Accept": "application/json",
}
TIMEOUT = aiohttp.ClientTimeout(total=30)
PAGE_SIZE = 100
MAX_PAGES = 10
# Catalog categories of grocery stores; used to find grocery chains nearby.
GROCERY_CATEGORIES = frozenset({"groceries", "hypermarket"})
# Flyer formats; without "incito" Hemköp and Tempo flyers are missing.
CATALOG_TYPES = "paged,incito"


class OffersApiError(Exception):
    """The flyer API failed or answered something unexpected."""


@dataclass(frozen=True, slots=True)
class ApiStore:
    """A store near home."""

    id: str
    chain: str
    name: str
    street: str
    latitude: float
    longitude: float
    dealer_id: str

    @property
    def title(self) -> str:
        """E.g. "ICA Nära Heden": chain plus the store's own name."""
        if self.name.casefold().startswith(self.chain.casefold()):
            return self.name
        return f"{self.chain} {self.name}".strip()


class TjekClient:
    """Fetches stores, flyers and offers around a point."""

    def __init__(
        self,
        session: aiohttp.ClientSession,
        latitude: float,
        longitude: float,
        radius_m: int,
    ) -> None:
        """Initialize the client."""
        self._session = session
        self._location = {
            "r_locale": "sv_SE",
            "r_lat": f"{latitude:.5f}",
            "r_lng": f"{longitude:.5f}",
            "r_radius": str(radius_m),
        }

    async def _get(self, path: str, params: dict[str, str]) -> Any:
        try:
            async with self._session.get(
                BASE_URL + path,
                params=self._location | params,
                headers=HEADERS,
                timeout=TIMEOUT,
            ) as resp:
                if resp.status != 200:
                    raise OffersApiError(f"{path}: HTTP {resp.status}")
                return await resp.json(content_type=None)
        except (aiohttp.ClientError, TimeoutError, ValueError) as err:
            raise OffersApiError(f"{path}: {err}") from err

    async def _get_all(self, path: str, params: dict[str, str]) -> list[dict[str, Any]]:
        """Every page of a list endpoint (it has no page info: stop on a short page)."""
        result: list[dict[str, Any]] = []
        for page in range(MAX_PAGES):
            data = await self._get(
                path,
                params | {"limit": str(PAGE_SIZE), "offset": str(page * PAGE_SIZE)},
            )
            if not isinstance(data, list):
                raise OffersApiError(f"{path}: expected a list")
            result.extend(d for d in data if isinstance(d, dict))
            if len(data) < PAGE_SIZE:
                break
        return result

    async def grocery_stores(self) -> list[ApiStore]:
        """Grocery stores within the radius, nearest first."""
        catalogs = await self._get_all("catalogs", {"types": CATALOG_TYPES})
        dealers = sorted(
            {
                c["dealer_id"]
                for c in catalogs
                if c.get("dealer_id")
                and GROCERY_CATEGORIES & set(c.get("category_ids") or [])
            }
        )
        if not dealers:
            return []
        stores = await self._get_all("stores", {"dealer_ids": ",".join(dealers)})
        result = []
        for s in stores:
            try:
                result.append(
                    ApiStore(
                        id=str(s["id"]),
                        chain=str((s.get("branding") or {}).get("name") or ""),
                        name=str(s.get("name") or ""),
                        street=str(s.get("street") or ""),
                        latitude=float(s["latitude"]),
                        longitude=float(s["longitude"]),
                        dealer_id=str(s.get("dealer_id") or ""),
                    )
                )
            except (KeyError, TypeError, ValueError):
                continue
        return result

    async def store(self, store_id: str) -> dict[str, Any]:
        """One store's details."""
        data = await self._get(f"stores/{store_id}", {})
        if not isinstance(data, dict):
            raise OffersApiError("store: expected an object")
        return data

    async def catalogs(self, store_id: str) -> list[dict[str, Any]]:
        """The flyers for a store (this week's, and next week's if out)."""
        return await self._get_all(
            "catalogs", {"store_id": store_id, "types": CATALOG_TYPES}
        )

    async def offers(self, catalog_ids: list[str]) -> list[dict[str, Any]]:
        """All offers in some flyers."""
        results = await asyncio.gather(
            *(self._get_all("offers", {"catalog_id": cid}) for cid in catalog_ids)
        )
        return [o for offers in results for o in offers]
