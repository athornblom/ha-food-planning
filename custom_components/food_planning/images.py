"""Local copies of recipe images, served to the recipe card."""

from __future__ import annotations

import logging
from pathlib import Path
import shutil

from aiohttp import ClientError

from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .const import DOMAIN, IMAGES_URL
from .extraction import FETCH_TIMEOUT, HEADERS
from .store import FoodPlanningStore

_LOGGER = logging.getLogger(__name__)

MAX_IMAGE_BYTES = 5_000_000
# Anything smaller is not a usable photo (e.g. a truncated download).
MIN_IMAGE_BYTES = 2_000
_EXTENSIONS = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
}


def images_dir(hass: HomeAssistant) -> Path:
    """Folder for saved images: /config/food_planning/images."""
    return Path(hass.config.path(DOMAIN, "images"))


def image_url(name: str) -> str:
    """URL the frontend loads a saved image from."""
    return f"{IMAGES_URL}/{name}"


async def async_save_image(
    hass: HomeAssistant, uid: str, url: str | None
) -> str | None:
    """Download an image and save it as <uid>.<ext>. Returns the file name.

    Failures are not errors: the recipe then shows the remote image, or none.
    """
    if not url or not url.startswith(("https://", "http://")):
        return None
    session = async_get_clientsession(hass)
    try:
        async with session.get(url, headers=HEADERS, timeout=FETCH_TIMEOUT) as resp:
            extension = _EXTENSIONS.get(resp.content_type)
            if resp.status != 200 or extension is None:
                _LOGGER.debug(
                    "Not saving image %s: %s %s", url, resp.status, resp.content_type
                )
                return None
            # Read the whole body in chunks. (content.read(n) returns only
            # what has arrived so far, which truncated images in 0.3.0.)
            data = bytearray()
            async for chunk in resp.content.iter_chunked(64 * 1024):
                data.extend(chunk)
                if len(data) > MAX_IMAGE_BYTES:
                    _LOGGER.debug(
                        "Image %s is larger than %d bytes", url, MAX_IMAGE_BYTES
                    )
                    return None
    except (ClientError, TimeoutError) as err:
        _LOGGER.debug("Could not download image %s: %s", url, err)
        return None
    if len(data) < MIN_IMAGE_BYTES:
        _LOGGER.debug("Image %s is only %d bytes", url, len(data))
        return None

    name = f"{uid}.{extension}"
    path = images_dir(hass) / name
    await hass.async_add_executor_job(path.write_bytes, bytes(data))
    return name


async def async_repair_images(hass: HomeAssistant, store: FoodPlanningStore) -> None:
    """Download images for recipes whose local copy is missing or broken.

    Covers recipes imported before images were saved, and images that 0.3.0
    saved truncated.
    """

    def _needs_repair(name: str | None) -> bool:
        if not name:
            return True
        path = images_dir(hass) / name
        return not path.is_file() or path.stat().st_size < MIN_IMAGE_BYTES

    changed = False
    for recipe in list(store.recipes):
        if not recipe.image_url:
            continue
        if not await hass.async_add_executor_job(_needs_repair, recipe.image):
            continue
        if name := await async_save_image(hass, recipe.uid, recipe.image_url):
            recipe.image = name
            changed = True
    if changed:
        await store.async_save()


async def async_delete_image(hass: HomeAssistant, name: str | None) -> None:
    """Delete a saved image, if there is one."""
    if name:
        path = images_dir(hass) / Path(name).name
        await hass.async_add_executor_job(lambda: path.unlink(missing_ok=True))


def ensure_images_dir(hass: HomeAssistant) -> Path:
    """Create the images folder. Runs in the executor."""
    path = images_dir(hass)
    path.mkdir(parents=True, exist_ok=True)
    return path


async def async_delete_all_images(hass: HomeAssistant) -> None:
    """Delete the images folder and the parent folder if it's then empty."""

    def _delete() -> None:
        shutil.rmtree(images_dir(hass), ignore_errors=True)
        parent = images_dir(hass).parent
        if parent.is_dir() and not any(parent.iterdir()):
            parent.rmdir()

    await hass.async_add_executor_job(_delete)
