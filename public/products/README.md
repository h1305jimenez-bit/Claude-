# Product photos

Drop your product photos here and they'll appear **automatically** in
the Auchan catalog. No code changes needed.

## How it works

Each product in `lib/products.ts` has an `id` field (e.g. `p-nutella`,
`f-banana`, `d-coke`, `hb-shampoo`). The Auchan product card tries to
load `/products/{id}.jpg` for each product. If the file exists, it
shows up. If not, the emoji shows up instead.

## How to add a photo

1. Find a photo. Easiest sources:
   - Open the Auchan website, find the product, right-click the
     image → **Save image as...**
   - Google Image Search the product name → save the image you like.
2. Save it with the **product id** as the filename, with a `.jpg`
   extension. For example:
   - Product id `p-nutella` → save as `p-nutella.jpg`
   - Product id `f-banana` → save as `f-banana.jpg`
3. Drop the file in this folder (`public/products/`).
4. Refresh the page in the browser. The photo appears.

## Tips

- **PNG or WEBP files:** rename them to `.jpg` first (or convert with
  any online tool). Only `.jpg` is checked automatically.
- **Square photos look best** (the card renders a square box). Any
  size works but 400x400 px is a good target.
- **Copyright:** don't redistribute someone else's photos commercially
  without permission. Auchan's own product images are generally fine
  for showing "what the product looks like" on an ordering app, but
  check their terms if you're unsure.

## Finding product ids

Open `lib/products.ts` and look at the `id` field of each entry.
Examples:

| Product | id | File to save |
|---|---|---|
| Nutella 400g | `p-nutella` | `p-nutella.jpg` |
| Coca-Cola 1.5L | `d-coke` | `d-coke.jpg` |
| Bananas 1kg | `f-banana` | `f-banana.jpg` |
| Ariel detergent | `h-detergent` | `h-detergent.jpg` |

## Bulk workflow

If you want to add photos for many products at once:

1. Open the Auchan website in one tab.
2. Open `lib/products.ts` in a code editor — copy each `id` as you
   find the matching product online.
3. Save each image with the id as filename.
4. Drag-and-drop them all into this folder at once.
