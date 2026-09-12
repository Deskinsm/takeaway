# TAKEAWAY

Educational turn-based **natural gas / LNG** learning game. Optimize for a new player who can, without outside help: identify what you sell and who buys it, complete a first sale, explain why another well might not raise sales, and distinguish **revenue**, **operating profit**, and **cash**.

Dual scores (Sandbox) still conflict:

1. **Cumulative sold volume** (index — **not reserves**)
2. **Realized operating profit** ($/MMBtu after opex)

Binding constraints migrate: **wells → pipeline takeaway → liquefaction → shipping → hub price**.

## Learn mode (recommended)

1. Title → **Learn** → company name / seed → short illustrated intro.
2. **Chapter 1 — First sale**: You already have a Permian lease + one well. Buy **pipeline capacity (takeaway)** so gas reaches **Henry Hub (US buyers)**, then **End Quarter**.
3. **Chapter 2 — The bottleneck**: Pipe is full. Answer the prediction, then choose **drill another well** vs **buy more takeaway**. Extra wells do not raise sales while takeaway binds — unmarketed gas is **left in the ground**.
4. After chapter 2: continue in **Sandbox**, or stub “more chapters coming.”

Hints + chapter restart are always available. Flow tab shows origin → transport → buyer with the binding link highlighted.

## Sandbox

Full basins (~**2015–2035** quarterly turns). **FID is a commit** — construction takes multiple quarters; spam-clicking does not finish projects. LNG = cooled liquid for ships; destinations are customer regions (Europe / Asia). **Netback** = destination price minus path costs (JKM includes a longer-haul premium vs TTF).

Prices are a **simulated scenario**, not historical accuracy.

## Stack

- Vite 8 + React 19 + TypeScript (strict)
- Tailwind CSS v4 (`@tailwindcss/vite`)
- IBM Plex Sans + IBM Plex Mono
- Pure TS engine under `src/game/` (seeded RNG, `applyAction`, `resolveQuarter`, construction projects)
- `localStorage` saves (`takeaway.save.v2`, migrates v1)
- Offline SPA — no auth, no DB

Requires **Node 22+** (`engines` field).

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

## Design note

The educational point is **constraint migration** and honest cashflow labels. Early game you are well-bound or takeaway-bound. FID unlocks liquefaction only after construction completes. Export headlines can look better while **netback** is worse. Chasing volume into a price crash or stranded (unmarketed) basin tanks the margin score — that divergence is intentional. Well output is a **fixed simplification** until decline curves exist.

## Known gaps / stubs

- Learn campaign: chapters 1–2 only (more coming)
- No oil track, storage, or deep contracts
- No multiplayer / auth; persistence is `localStorage` only
- Shipping is a global capacity pool (not vessel classes)
- End year 2035 is a hard horizon

## License

MIT (scaffold). Educational simulation — not investment advice.
