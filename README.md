# TAKEAWAY

Educational turn-based **gas / LNG E&P** game. You run an explorer-producer from ~**2015–2035** (quarterly turns). Dual wins conflict:

1. **Volumes / reserves** (cumulative sold mmbtu index)
2. **Realized margin** ($/mmbtu after costs)

Binding constraints migrate along the chain: **wells → pipeline takeaway → liquefaction → shipping → hub price** (Henry Hub / TTF / JKM).

Winter spikes, FIDs, and cargo diversion are first-class mechanics — not lore text.

## Stack

- Vite 8 + React 19 + TypeScript (strict)
- Tailwind CSS v4 (`@tailwindcss/vite`)
- IBM Plex Sans + IBM Plex Mono
- Pure TS engine under `src/game/` (seeded RNG, `applyAction`, `resolveQuarter`)
- `localStorage` saves
- Offline SPA — no auth, no DB

Requires **Node 22+** (`engines` field). Node 20 often works for local `test` / `dev`.

## Run

```bash
npm install
npm run dev      # http://0.0.0.0:8080
```

```bash
npm test         # engine unit tests
npm run typecheck
npm run build
```

## Vertical slice (v1)

- **New game**: company name + seed (or random); starts **Q4 2015** with cash
- **Basins**: Permian Gas, Haynesville, Qatar North Field Feed, Australia LNG Feed (abstract but named)
- **Actions**: acquire lease, drill wells, buy takeaway, progress FID, book liquefaction, charter shipping, schedule TTF/JKM cargoes, end quarter
- **Resolution**: production limited by `min` of the chain; seasonality + seeded price noise; cash & dual scores update; HUD shows binding constraint
- **HUD / tabs**: Command · Field · Midstream · Market — dense industrial UI with glossary tooltips (takeaway, basis, FID, mmbtu, hubs)

## Design note

The educational point is **constraint migration**. Early game you are well-bound or takeaway-bound (Permian / Haynesville lore). Mid game FID and liquefaction lock export optionality. Late game shipping and hub choice (cargo diversion between TTF and JKM) matter most when winter seasonality spikes European/Asian markers. Chasing volume into a price crash or stranded-gas basin tanks the margin score — that divergence is intentional.

## Known gaps / stubs

- No multiplayer, no auth, no persistence beyond `localStorage`
- Australia is always available (not gated by a tech/political tree)
- No explicit basis differential curves per basin — hubs are global markers
- Shipping is a single global capacity pool (not route-days / vessel classes)
- No oil / NGL co-products; gas/LNG only
- End year 2035 is a hard horizon, not a scored scenario pack

## License

MIT (scaffold). Educational simulation — not investment advice.
