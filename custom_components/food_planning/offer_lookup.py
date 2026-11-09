"""The only thing the core knows about store offers.

The optional offers module (offers/) registers an OfferLookup on the
runtime data when it's turned on. Everything else asks it which offers
there are for a product name and works the same, just without offers,
when it's None or answers nothing.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Protocol


@dataclass(frozen=True, slots=True)
class OfferHit:
    """One offer at one of the selected stores."""

    store: str
    # Chain name for short texts, e.g. "Willys" for "Willys Hemma Gibraltargatan".
    chain: str
    heading: str
    # The offer price, for `pieces` items ("2 för 30": price 30, pieces 2).
    price: float
    pieces: int
    valid_until: str
    quantity: str | None = None
    # The price without the offer, for the same number of pieces, when
    # the flyer states it (or the lowest price of the last 30 days).
    ordinary_price: float | None = None
    discount_percent: int | None = None
    # "stated" (ordinary price or "spara"), "lowest_30d", or None.
    discount_source: str | None = None
    comparison: str | None = None
    member: bool = False
    max_per_household: int | None = None
    image: str | None = None

    @property
    def saving(self) -> float | None:
        """Kronor saved on the offer, when the flyer states it."""
        if self.ordinary_price is None or self.discount_source != "stated":
            return None
        return round(self.ordinary_price - self.price, 2)

    def as_json(self) -> dict[str, Any]:
        """For the dashboards and action responses."""
        return asdict(self) | {"saving": self.saving}


class OfferLookup(Protocol):
    """Answers which offers there are for a product name."""

    @property
    def min_discount(self) -> int:
        """Discount in percent from which an offer counts as a real deal."""

    def offers_for(self, product: str) -> list[OfferHit]:
        """Offers for a product name (see the store's names), best first."""


def is_deal(hit: OfferHit, min_discount: int) -> bool:
    """An offer with a known discount of at least min_discount percent."""
    return hit.discount_percent is not None and hit.discount_percent >= min_discount
