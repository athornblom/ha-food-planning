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
2. **TikTok:** the video's caption is read through TikTok's public oEmbed
   endpoint. Videos where the recipe is only spoken, with nothing written
   in the caption, can't be imported yet.
3. **Sites that block automated access** (some large recipe sites do) are
   respected rather than worked around: the import fails with a message
   saying so. Copy the recipe text and use `food_planning.import_recipe`
   with `text` instead.
4. The AI task returns a structured recipe (title, servings, ingredients,
   steps, notes), written in the configured language and with US units
   converted to metric.

## What you get

| Entity | Name (sv / en) | Use |
| --- | --- | --- |
| `todo.food_planning_recipes` | Recept / Recipes | Saved recipes. The description holds ingredients and steps. Ticking one off marks it as cooked. |
| `todo.food_planning_shopping_list` | Inköpslista / Food shopping list | The shopping list. Works with Assist and the to-do card. |
| `text.food_planning_recipe_url` | Receptlänk / Recipe link | Paste a link here on the dashboard. |
| `button.food_planning_import_recipe` | Importera recept / Import recipe | Imports the pasted link, then clears it. |
| `select.food_planning_selected_recipe` | Valt recept / Selected recipe | Pick a recipe. A fresh import selects itself. |
| `button.food_planning_add_to_shopping_list` | Lägg i inköpslistan / Add to shopping list | Adds the selected recipe's ingredients, skipping ones already on the list. |

Names follow Home Assistant's system language.

### Actions

- `food_planning.import_recipe`: `url` **or** `text`, plus optional
  `add_to_shopping_list`. Can return the recipe as a response.
- `food_planning.add_recipe_to_shopping_list`: `recipe` (title or ID).

### Adding or editing recipes by hand

Add an item to the recipe list and write the recipe in its description.
Text under an `### Ingredienser` (or `Ingredients`) heading becomes the
ingredients, one per line; text under `### Gör så här` (or `Steps`,
`Instructions`, `Method`) becomes the steps; anything else is kept as notes.

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

Both can be changed later under the integration's **Configure** button.

## Data, backups and removal

- Recipes and the shopping list are stored in
  `/config/.storage/food_planning`, separate from the code, so updates
  never touch them. Normal Home Assistant backups include the file.
- Deleting the integration (Settings → Devices & services → Food Planning
  → Delete) **deletes that file**. Restore a backup to get the data back.
- The pasted link and the selected recipe aren't saved; they reset on
  restart.

## Releasing

1. Bump `version` in `custom_components/food_planning/manifest.json`.
2. Tag and publish a GitHub release with the same version, e.g. `v0.2.0`.

## Roadmap

- Dashboard card for browsing recipes with images.
- Importing spoken-only videos via transcription.
