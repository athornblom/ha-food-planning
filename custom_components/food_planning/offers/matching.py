"""Match offers to the household's own product names, in code.

The product names (store.names: "kycklingfilé", "grädde", "gul lök") are
already worked out for every ingredient and list item. An offer matches a
product when its heading has the product as a word, or as the last part
of a compound word, since Swedish compounds put the main word last:
"VISPGRÄDDE" is grädde, but "SMÖRGÅSMAT" isn't smör. Plural endings are
ignored on both sides ("TOMATER" is tomat).
"""

from __future__ import annotations

import re

_WORD = re.compile(r"[^\W\d_]+")
# Swedish plural and definite endings, longest first.
_ENDINGS = ("orna", "erna", "arna", "or", "er", "ar", "na", "en", "et", "a", "n", "r")
# Shorter products only match whole words: "ris" isn't "jasminris"'s main
# word often enough to be safe, and "fil" would match "gräddfil".
MIN_COMPOUND = 4


# Compounds that end in a product's name but are a different product.
DIFFERENT_PRODUCTS = frozenset(
    {
        "sötpotatis",
        "kokosmjölk",
        "havremjölk",
        "mandelmjölk",
        "sojamjölk",
        "kokosgrädde",
        "havregrädde",
        "sojagrädde",
        "drickyoghurt",
        "vegosmör",
        "jordnötssmör",
        "kryddsmör",
        "vitlökssmör",
        "kycklingkorv",
    }
)


def stem(word: str) -> str:
    """A word without its plural or definite ending, at least 3 letters."""
    for ending in _ENDINGS:
        if word.endswith(ending) and len(word) - len(ending) >= 3:
            return word[: -len(ending)]
    return word


def words(text: str) -> list[str]:
    """Lowercase stems of the words in a text, without known traps."""
    return [
        stem(w) for w in _WORD.findall(text.casefold()) if w not in DIFFERENT_PRODUCTS
    ]


def _word_matches(product_word: str, offer_words: list[str]) -> bool:
    return any(
        w == product_word
        or (len(product_word) >= MIN_COMPOUND and w.endswith(product_word))
        for w in offer_words
    )


def matches(product: str, offer_words: list[str]) -> bool:
    """Whether an offer (its heading's words) is this product."""
    product_words = words(product)
    return bool(product_words) and all(
        _word_matches(w, offer_words) for w in product_words
    )


def match_products(heading: str, products: set[str]) -> list[str]:
    """The products an offer heading matches, the most specific ones.

    "Finkrossade tomater" is krossade tomater, not also tomat, when the
    household has both.
    """
    offer_words = words(heading)
    found = {p: " ".join(words(p)) for p in products if matches(p, offer_words)}
    return sorted(
        p
        for p, key in found.items()
        if not any(
            len(other) > len(key) and other.endswith(key) for other in found.values()
        )
    )
