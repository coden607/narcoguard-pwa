# Offline map tiles (Feature 60)

Offline maps are **opt-in, off by default, and disabled until a tile provider is configured**. No map
provider is contacted, and no location leaves the device, before a person turns the setting on.

## Deployment config (public build-time values, no secrets in the repo)

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_OFFLINE_MAP_TILE_URL` | https tile template containing `{z}`, `{x}` and `{y}`, for a provider whose terms allow offline or prefetched tiles |
| `NEXT_PUBLIC_OFFLINE_MAP_ATTRIBUTION` | the attribution text that provider requires (shown next to saved maps) |

Both must be set; if either is missing or invalid the feature stays hidden. Hosts under
`openstreetmap.org` are refused because the public OSM tile server forbids prefetching. Keyed
providers must be used with a key that is restricted to this site's domain, because the template
is public in the browser bundle.

## Behavior

- A consent checkbox in the resource match card, unchecked by default, names the provider host and
  says what it can see. Consent is per provider; changing the template turns it off again.
- After opt-in the page (not the service worker) saves up to 12 tiles around the saved place and up
  to two known resources, using no cookies and no referrer, into the `narcoguard-map-tiles-v1`
  Cache API cache (hard cap 48). The saved place's own tiles are kept first when the cap cuts.
- `/offline.html` only reads that cache; it never requests a provider.
- Turning the setting off, or forgetting the saved place, deletes the saved tiles.
