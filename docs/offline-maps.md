# Offline map tiles (Feature 60)

Opt-in, off by default, and hidden until a tile provider is configured. No provider is contacted
before a person turns it on.

Deployment config (public build-time values, no secrets in the repo; both required):

- `NEXT_PUBLIC_OFFLINE_MAP_TILE_URL`: https template with `{z}`, `{x}`, `{y}` for a provider whose terms allow offline tiles. `openstreetmap.org` hosts are refused.
- `NEXT_PUBLIC_OFFLINE_MAP_ATTRIBUTION`: the attribution text the provider requires.

After opt-in the page saves up to 12 tiles (cap 48, no cookies, no referrer) in the Cache API.
`/offline.html` only reads them. Turning it off or forgetting the saved place deletes them.
