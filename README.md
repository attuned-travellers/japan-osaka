# japan-osaka

Osaka (大阪) travel notes and itineraries by **Attuned Travellers**.

## Overview

A working repository for planning and documenting trips to Osaka, Japan —
itineraries, neighbourhood notes, transport tips, food and lodging picks,
and anything else worth keeping between visits.

## Structure

```
.
├── itineraries/   # day-by-day plans
├── places/        # streets, markets, bars, day trips
├── logistics/     # transport, passes, accommodation
└── notes/         # seasonal tips, phrases, misc.
```

Directories are added as content grows.

## Travel cards (`index.html`)

Open `index.html` in a browser (no build step, works from `file://`).
The viewer uses the shared engine from `../travel-kit` (same design as japan-kyoto).

```
index.html            # card viewer — lists the data scripts to load
assets/               # trip-cards.js / .css (copied from travel-kit — don't edit here)
places/data/
  _config.js          # Trip.config: categories, groups, areas, seasonal field (load first)
  spots.js night.js food.js cafe.js shopping.js daytrip.js
```

**Add a place:** append an object to the matching file's `Trip.add([...])`.
Required fields: `id`, `category`, `name`, `area`, `summary` — see the schema
comment at the top of `assets/trip-cards.js` for optional fields (`october`, `tips`, `where`, …).

**Add a category / area:** add a key to `categories` / `areas` in `_config.js`.

**Add a data file:** create `places/data/<name>.js` and add a `<script>` line
for it in `index.html` (after `_config.js`).

**Change the engine/design:** edit `../travel-kit/assets/` and run `../travel-kit/sync.sh`.

## Contributing

1. Create a branch for your changes.
2. Keep one topic per file and use descriptive filenames.
3. Open a pull request for review.

## License

Content in this repository is for personal travel planning use.
