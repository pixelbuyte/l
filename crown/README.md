# Crown Fried Chicken

A single-page site for the fried chicken counter at **443 Lincoln St, Worcester,
MA** — the one with the red roofline and the crown badge over the left window.

Dark ground, bone type, and the sign's red taken down to a brick that appears
as a rule and a button rather than as the theme. The building outside is
fire-engine red; a page at that volume reads as decoration instead of as the
address, the hours and the price of two pieces of chicken.

No build step, no dependencies, no framework. Open `index.html` in a browser, or
serve the directory over HTTP.

```
python3 -m http.server 8000     # then visit localhost:8000/crown/
node crown/test/run.js          # 4,518 assertions
```

## What is on the page

A sticky bar across the top (Menu · Specials · Gallery · Visit, plus the phone
number), a hero on the storefront itself, the menu board, the four cheapest
plates, a gallery of the building, and a map.

## Where the facts came from

This page makes claims about somebody's real business, so nothing on it is
invented. Every fact is asserted in the test suite, and anything that could not
be sourced was left off rather than guessed at.

| Fact | Source |
| --- | --- |
| Address, listing id, coordinates | The Google Maps listing; the building footprint geocoded against OpenStreetMap |
| Phone, `(508) 595-0220` | Published listings — and legible on the right-hand window in Street View |
| Hours, 10:00am – 12:00am daily | Published listings for this address |
| Menu and prices | Published combo prices for this address |
| Photography | Google Street View, panorama `tUaswcEJKwm-FW6Cmm7tBg` |

The menu is the combo board only. Buckets, salads, sides, shakes and ice cream
are sold in store but were not published with prices anywhere we could check, so
the page says they exist and tells you to call rather than quoting a number it
would be making up.

### The photographs

The four food photographs in `img/food-*.webp` are this kitchen's own, from
its Google Maps listing. Google serves the listing through an interface we
could not read directly, so they were taken from Restaurant Guru, which mirrors
the listing's photos; they arrive as watermarked collages, and the clean tiles
were cut out and squared. They are small (220–320 px) for that reason. The item
that carries a `photo` in `data/place.js` is the one the plates section shows.

The building photographs are rendered out of Google's Street View panorama of
the block: the equirectangular tiles are
fetched at zoom 4 (8192 × 4096), stitched, and reprojected gnomonically to a
rectilinear frame at a chosen heading and field of view — which is why the
storefront looks photographed rather than cropped out of a panorama. Imagery is
© Google and credited on the page.

To swap in better photographs, drop them in `img/` and edit the `photo` fields
or the `GALLERY` array in `data/place.js`. Keep the gallery spans tiling the
grid — the tests check that.

## The one piece of real logic

`js/hours.js` decides whether the shop is open. It reads the clock in
`America/New_York` rather than the visitor's timezone, so somebody looking this
up from another continent gets the truthful answer, and it reports the last hour
before close as `closing` rather than a flat `open`.

A shop that shuts at midnight is exactly where this sort of code goes wrong, so
the tests sweep all 1,440 minutes of the day and assert the open window is
exactly as long as the published hours, that midnight folds to 0 rather than
1440, that the overnight wait crosses midnight correctly, and that the reading
does not change when the process timezone does.

## Layout notes

The gallery is hand-tiled, not auto-flowed: the five spans add up to exactly
three columns (1+2, 2+1, 3) and to exactly two at the tablet breakpoint. Get
that sum wrong and CSS grid silently leaves a hole, so `test/run.js` walks the
placement and asserts there are none.

The specials are not a second list to keep in step with the menu — they are
computed as the cheapest plate in each section of the board.

## Deploying

GitHub Pages publishes this directory from the workflow at the repository root,
with `img/` and `fonts/` served alongside the page — which is what the relative
paths in the source assume.

`tools/make-deploy.js` exists for hosts that accept only inlined file contents,
where shipping a few hundred kilobytes of WebP and WOFF2 is impractical. It
writes a copy of the six text files with the binary references rewritten to a
CDN base URL, and never touches the source tree:

```
node crown/tools/make-deploy.js https://example.com/assets .deploy
```

A live copy built that way, with the assets served from this branch on
`raw.githubusercontent.com`, is at
<https://marvins-diner-v1.vercel.app/>. That arrangement is fine for a preview
but is not how this should be hosted long term — pointing the host at the
repository directly serves the assets from the same origin and drops the
rewrite entirely.

## The promo film

`promo/crown-fried-chicken.mp4` — sixteen seconds, 1920 x 1080, cut from the
same Street View frames and the same menu prices as the page.

`promo/index.html` is the source, and it is not a CSS animation: every opacity
and transform is a pure function of a time in seconds, exposed as
`window.RENDER(t)`. A screenshot at frame *n* is therefore reproducible and does
not depend on when the capture happened to land. `promo/capture.js` steps that
function frame by frame and writes PNGs; ffmpeg turns them into the file.

```
python3 -m http.server 8000                 # from the repository root
node crown/promo/capture.js                 # writes crown/promo/frames/
ffmpeg -framerate 30 -i crown/promo/frames/%04d.png \
       -vf "scale=1920:1080:flags=lanczos,format=yuv420p" \
       -c:v libx264 -preset slow -crf 21 -movflags +faststart \
       crown/promo/crown-fried-chicken.mp4
```

## Fonts

Alfa Slab One, Bungee and Karla, self-hosted from `fonts/` rather than fetched
from Google. All three are SIL Open Font License. Latin subset only, and Karla
ships as one variable file covering 400–700.
