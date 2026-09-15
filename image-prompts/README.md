# Product segment image prompts

Four standalone prompts, one per product segment. Each file is a complete,
self-contained brief — the shared style block is repeated in all four so the images
come out looking like one photo shoot.

| # | File | Segment | Page |
|---|------|---------|------|
| 1 | `1-architectural.md` | Architectural profiles | `architectural.html` |
| 2 | `2-industrial.md` | Industrial extrusions | `industrial.html` |
| 3 | `3-custom-dies.md` | Custom die development | `custom-dies.html` |
| 4 | `4-standard-shapes.md` | Standard shapes | `standard-shapes.html` |

## How to run them

**Paste each prompt into its own fresh ChatGPT message.** Ideally start a new chat
for each one. Sending all four in a single message is what made the first attempt
return four variations of the architectural profiles instead of four different
segments.

You already have a usable architectural image, so in practice you only need to run
prompts 2, 3 and 4.

## Before putting the images on the site

- Convert PNG to JPG or WebP and compress to roughly 150–250 KB each. The raw
  ChatGPT PNGs are about 2 MB and will slow the page down.
- Name them `architectural.jpg`, `industrial.jpg`, `custom-dies.jpg`,
  `standard-shapes.jpg`.
- Optionally warm the background slightly to match the site's `--paper` (#FBFAF7);
  the generated backdrop is a cooler neutral grey.

## What changed from the original combined prompt

`../product-image-prompt.md` is the original all-in-one version, kept for reference.
These four files differ from it in three ways:

1. Each demands **exactly one image**, with no variations or grids.
2. Prompts 2, 3 and 4 explicitly state "this is NOT a window or curtain-wall image",
   because the model defaulted to architectural profiles for every generation.
3. All four require the arrangement to sit fully inside the frame with margin —
   the fourth generated image had a profile bleeding off the left edge.

Prompt 3 was revised again after the second round: the first version let the model
pair the die with a T-slot profile, which duplicated the subject of card 2. It now
forbids T-slot shapes outright, specifies an asymmetric bespoke cross-section, and
requires the die aperture, the profile end and the drawing to all show that same
shape.
