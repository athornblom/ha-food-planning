# Food Planning for Home Assistant

A custom integration that keeps a recipe list and a food shopping list in
Home Assistant. Paste a link to a recipe page or a TikTok video and the
recipe is extracted by an AI model and saved; one button adds its
ingredients to the shopping list.

Extraction goes through Home Assistant's own **AI task** feature, so the
API key and model live in an AI integration you already trust (for example
Anthropic with Claude Haiku 5.5), not in this integration.

## How a link becomes a recipe

1. **Recipe pages:** most recipe sites embed the recipe as schema.org
   structured data. If it's there, only that is sent to the model, which
   keeps imports small and accurate. Otherwise the page's visible text is
   sent.
2. **TikTok:** the video's caption is read from the data TikTok embeds in
   the public video page (with TikTok's oEmbed endpoint as a fallback). Videos where the recipe is only spoken, with nothing written
   in the caption, can't be imported yet.
3. **Sites that block automated access** (some large recipe sites do) are
   respected rather than worked around: the import fails with a message
   saying so. Copy the recipe text and paste it into the recipe card
   instead.
4. The AI task returns a structured recipe (title, servings, ingredients,
   steps, notes), written in the configured language and with US units
   converted to metric.

## What you get

### Recipe card

The integration ships its own dashboard card; nothing else to install.
Add it to any dashboard:

```yaml
type: custom:food-planning-card
# title: Recept      # optional
# language: sv       # sv (default) or en
```

- A field at the top takes a **link** (recipe page or TikTok) or pasted
  **recipe text**, for sites that block automated access.
- Recipes show as a grid of images. Tap one for the full recipe: image,
  ingredients (tap to tick off while cooking), numbered steps, tips, a link
  to the source, and buttons to add the ingredients to the shopping list or
  delete the recipe.
- A search field appears once there are a handful of recipes.

### Shopping list

`todo.food_planning_shopping_list` ("Inköpslista" / "Food shopping list")
is a normal to-do list: use it with the to-do card, the companion app and
Assist ("lägg till mjölk på inköpslistan").

**Duplicates are merged by the AI.** A couple of seconds after items are
added (from a recipe, by hand or by voice), the open items are sent to the
AI task, which merges items that are the same product, e.g. "2 msk
olivolja" and "15 ml olivolja" into "3 msk olivolja". Only groups of two or
more items are changed, so an item without a duplicate is never rewritten,
and an item you edited or ticked off in the meantime is left alone. Turn it
off under the integration's **Configure** button.

### Actions

- `food_planning.import_recipe`: `url` **or** `text`, plus optional
  `add_to_shopping_list`. Can return the recipe as a response.
- `food_planning.add_recipe_to_shopping_list`: `recipe` (title or ID).

## Requirements

- Home Assistant 2026.11 or newer.
- An AI integration that provides an AI task entity, e.g. **Anthropic**
  (Settings → Devices & services → Add integration → Anthropic) with a
  model such as Claude Haiku 5.5. API usage is billed by the provider; a
  Claude subscription does not include API usage.

## Installation

### Manual

1. Copy `custom_components/food_planning/` into `/config/custom_components/`
   on the Home Assistant host (Samba share or the Studio Code Server app).
2. Restart Home Assistant.
3. Settings → Devices & services → Add integration → **Food Planning**.

Updating means copying the folder again and restarting.

### From the Marketplace

Settings → Marketplace → ⋮ → Custom repositories → add this repository as
an **Integration**, install **Food Planning**, then add the integration as
above. Updates show up in the Marketplace when a new GitHub release is
published.

## Configuration

- **AI task entity:** leave empty to use the preferred AI task entity set
  in Settings → System → General.
- **Recipe language:** the language recipes are written in (default
  `Swedish`).
- **Merge duplicate shopping items:** on by default, see above.

All can be changed later under the integration's **Configure** button.

## Data, backups and removal

- Recipes and the shopping list are stored in
  `/config/.storage/food_planning`, and recipe images in
  `/config/food_planning/images` (saved at import, since some image links,
  like TikTok's, expire). Both are separate from the code, so updates never
  touch them, and normal Home Assistant backups include them.
- Saved images are served without login at `/food_planning/images/…`,
  like files in `/config/www`. The file names are random.
- Deleting the integration (Settings → Devices & services → Food Planning
  → Delete) **deletes the data and the images**. Restore a backup to get
  them back.

## Releasing

1. Bump `version` in `custom_components/food_planning/manifest.json`.
2. Tag and publish a GitHub release with the same version, e.g. `v0.2.0`.

## Roadmap

- Editing recipes in the card.
- Importing spoken-only videos via transcription.
