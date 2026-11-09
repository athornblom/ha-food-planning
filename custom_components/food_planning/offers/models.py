"""Offers as the flyer API sends them, turned into prices and discounts."""

from __future__ import annotations

from dataclasses import asdict, dataclass
import re
from typing import Any

from ..offer_lookup import OfferHit

# "SPARA 4:80", "Spara 3:80", "SPARA 7:49-7:70" (the first number counts).
_SAVE_RE = re.compile(r"\bspara\s+(\d+)(?:[:,.](\d{1,2}))?", re.IGNORECASE)
# "Lägsta 30-dgrspris 39:90 kr", "lägsta pris 30 dagar 12,90".
_LOWEST_RE = re.compile(
    r"lägsta\s*(?:30[- ]?(?:dgrs|dagars)?\s*pris|pris\s*30\s*dagar)\D{0,4}"
    r"(\d+)(?:[:,.](\d{1,2}))?",
    re.IGNORECASE,
)
# "Max 3 köp/hushåll", "MAX 3/KUND", "Max 2 st".
_MAX_RE = re.compile(r"\bmax\.?\s*(\d+)\b(?!\s*(?:kg|g|%))", re.IGNORECASE)
# "Jfr pris 110:00/kg", "Jämförpris 43:75 kr/kg", "jmf-pris 133,17/kg".
_COMPARE_RE = re.compile(
    r"(?:jfr|jmf|jämför)[.\s-]*pris\s*(?:\d+\s*för\s*)?"
    r"(\d+(?:[:,.]\d{1,2})?(?:\s*-\s*\d+(?:[:,.]\d{1,2})?)?)\s*(?:kr)?\s*/\s*(\w+)",
    re.IGNORECASE,
)
_MEMBER_RE = re.compile(
    r"willys\s*plus|stammis|klubbpris|medlemspris|för medlemmar|lidl\s*plus|"
    r"coop[- ]medlem|hemköpskort",
    re.IGNORECASE,
)


def _money(whole: str, cents: str | None) -> float:
    return int(whole) + (int(cents.ljust(2, "0")) / 100 if cents else 0)


def _as_float(value: Any) -> float | None:
    try:
        return float(value) if value is not None else None
    except (TypeError, ValueError):
        return None


@dataclass(slots=True)
class Offer:
    """One offer in a store's flyer."""

    id: str
    store_id: str
    heading: str
    description: str
    price: float
    pieces: int
    valid_from: str
    valid_until: str
    quantity: str | None = None
    ordinary_price: float | None = None
    discount_percent: int | None = None
    discount_source: str | None = None
    comparison: str | None = None
    member: bool = False
    max_per_household: int | None = None
    image: str | None = None

    @property
    def unit_price(self) -> float:
        """Price per piece ("2 för 30" -> 15)."""
        return self.price / max(self.pieces, 1)

    def as_dict(self) -> dict[str, Any]:
        """For storage."""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Offer:
        """From storage."""
        return cls(**{k: data[k] for k in cls.__slots__ if k in data})  # type: ignore[attr-defined]

    def hit(self, store: str, chain: str) -> OfferHit:
        """The offer as the core sees it."""
        return OfferHit(
            store=store,
            chain=chain,
            heading=self.heading,
            price=self.price,
            pieces=self.pieces,
            valid_until=self.valid_until,
            quantity=self.quantity,
            ordinary_price=self.ordinary_price,
            discount_percent=self.discount_percent,
            discount_source=self.discount_source,
            comparison=self.comparison,
            member=self.member,
            max_per_household=self.max_per_household,
            image=self.image,
        )


def _quantity(data: dict[str, Any]) -> str | None:
    """E.g. "900 g", "90–160 g", "ca 1 kg"."""
    quantity = data.get("quantity") or {}
    unit = ((quantity.get("unit") or {}).get("symbol") or "").strip()
    size = quantity.get("size") or {}
    low, high = _as_float(size.get("from")), _as_float(size.get("to"))
    if not unit or unit == "pcs" or low is None:
        return None
    text = f"{low:g}" if high in (None, low) else f"{low:g}–{high:g}"
    return f"{text} {unit}".replace(".", ",")


def parse_offer(data: dict[str, Any], store_id: str) -> Offer | None:
    """An offer from the API, or None if it has no usable price."""
    pricing = data.get("pricing") or {}
    price = _as_float(pricing.get("price"))
    heading = " ".join(str(data.get("heading") or "").split())
    if price is None or price <= 0 or not heading:
        return None
    description = str(data.get("description") or "")
    flat = " ".join(description.split())
    pieces_info = (data.get("quantity") or {}).get("pieces") or {}
    try:
        pieces = max(int(pieces_info.get("from") or 1), 1)
    except (TypeError, ValueError):
        pieces = 1
    images = data.get("images") or {}
    offer = Offer(
        id=str(data.get("id") or ""),
        store_id=store_id,
        heading=heading,
        description=flat,
        price=price,
        pieces=pieces,
        valid_from=str(data.get("run_from") or ""),
        valid_until=str(data.get("run_till") or ""),
        quantity=_quantity(data),
        member=bool(_MEMBER_RE.search(flat)),
        image=images.get("view") or images.get("thumb"),
    )
    if match := _MAX_RE.search(flat):
        offer.max_per_household = int(match.group(1))
    elif (cap := pieces_info.get("max")) and str(cap).isdigit():
        offer.max_per_household = int(cap)
    if match := _COMPARE_RE.search(flat):
        offer.comparison = f"{match.group(1).replace(' ', '')} kr/{match.group(2)}"
    _set_discount(offer, _as_float(pricing.get("pre_price")), flat)
    return offer


def _set_discount(offer: Offer, pre_price: float | None, text: str) -> None:
    """The ordinary price and discount, only from what the flyer states.

    pre_price or "SPARA" give the ordinary price ("stated"). Otherwise
    the lowest price of the last 30 days, which stores must print, is the
    reference ("lowest_30d"). Without either the discount is unknown.
    """
    ordinary: float | None = None
    source: str | None = None
    if pre_price and pre_price > offer.price:
        ordinary, source = pre_price, "stated"
    elif (match := _SAVE_RE.search(text)) and "per kg" not in text.casefold():
        saving = _money(match.group(1), match.group(2))
        if 0 < saving < offer.price * 3:
            ordinary, source = offer.price + saving, "stated"
    elif match := _LOWEST_RE.search(text):
        # Printed per piece; compare with the price per piece.
        lowest = _money(match.group(1), match.group(2)) * offer.pieces
        if lowest > offer.price:
            ordinary, source = lowest, "lowest_30d"
    if ordinary is None:
        return
    offer.ordinary_price = round(ordinary, 2)
    offer.discount_source = source
    offer.discount_percent = round((ordinary - offer.price) / ordinary * 100)
