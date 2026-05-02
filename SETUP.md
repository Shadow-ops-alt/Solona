# ChainRemit — Setup

Quickstart for teammates. If you can `git clone` and `npm install`, you're 90% of the way there — this monorepo uses npm workspaces, so a single install pulls everything.

> Note: this is a Node/TypeScript project, so there's no `requirements.txt`. All dependencies live in `package.json` files and are pinned by `package-lock.json`. Don't install anything by hand.

---

## 1. Prerequisites

Install these once on your machine:

| Tool    | Version | Why                         | Install                                                |
| ------- | ------- | --------------------------- | ------------------------------------------------------ |
| Node.js | 20.x or 22.x (24 also works) | Runtime for relayer + web   | https://nodejs.org or `nvm install 22 && nvm use 22`   |
| npm     | 10+ (project pins 11.11.0)   | Package manager / workspaces | Bundled with Node                                     |
| Git     | any                          | —                           | https://git-scm.com                                    |

Verify:

```bash
node -v   # v20.x.x or higher
npm -v    # 10.x.x or higher
```

**Optional** (only needed if you're rebuilding/deploying the on-chain Anchor program — most teammates won't):

- Rust + `rustup`
- Solana CLI
- Anchor CLI

The program is already deployed on devnet at program ID `2AeboQZoaSyBoC2YRcVHvL9CYh5embbddQ6pFubCKdoZ`, so you can run the full app without these.

---

## 2. Clone & install (one-time)

```bash
git clone <repo-url> chainremit
cd chainremit
npm install
```

That single `npm install` walks all three workspaces (`apps/web`, `apps/relayer`, plus the root) and downloads everything.

---

## 3. Environment variables (relayer only)

The relayer has optional env vars for live on-chain integration. The web app needs none.

```bash
cp apps/relayer/.env.example apps/relayer/.env
```

Then edit `apps/relayer/.env` if you want non-demo mode. The defaults are fine for local development:

| Variable               | Default            | Effect                                                              |
| ---------------------- | ------------------ | ------------------------------------------------------------------- |
| `PORT`                 | `8787`             | Relayer port                                                        |
| `WEB_BASE_URL`         | `http://localhost:5173` | Used in claim links sent in `/api/remittances` responses       |
| `SOLANA_RPC_URL`       | devnet             | Devnet works out of the box                                         |
| `RELAYER_PRIVATE_KEY`  | _unset_            | If unset, on-chain release is skipped (DEMO mode signature returned) |
| `MERKLE_TREE_ADDRESS`  | _unset_            | If unset, cNFT receipt mint is skipped                              |
| `COLLECTION_MINT`      | _unset_            | Same as above                                                       |
| `AGENT_PIN`            | `1234`             | Demo PIN for the agent console (`/agent` route)                     |
| `AGENT_PIN_HASH`       | _unset_            | Production: sha256 hex of `salt + pin`                              |
| `AGENT_PIN_SALT`       | _unset_            | Production: paired with the hash                                    |

In demo mode (no key set) every flow still works end-to-end against the in-memory store — the only difference is no real on-chain signature is produced.

---

## 4. Run

From the repo root:

```bash
npm run dev
```

This starts the relayer and the web app together:

- Web: http://localhost:5173
- Relayer: http://localhost:8787

If you only need one, use:

```bash
npm run dev:web        # web only
npm run dev:relayer    # relayer only (keep this running while using the web app)
```

> **Common gotcha:** If you only run `dev:web`, the browser console will show `ECONNREFUSED 127.0.0.1:8787` for every API call. Start the relayer in another terminal.

Sanity check the relayer:

```bash
curl http://localhost:8787/health        # {"ok":true}
curl http://localhost:8787/api/fx-rate   # {"rate":..., "provider":"PYTH_LIVE", "asOfMs":...}
```

---

## 5. Useful scripts

| Command                       | What                                                |
| ----------------------------- | --------------------------------------------------- |
| `npm run dev`                 | Relayer + web (parallel)                            |
| `npm run dev:web`             | Web only                                            |
| `npm run dev:relayer`         | Relayer only                                        |
| `npm run build`               | Type-check + build both packages for production     |
| `npm run lint`                | ESLint both packages                                |
| `npm -w apps/web run preview` | Serve the production web build locally              |

---

## 6. App tour

Once everything's running, open http://localhost:5173 and try the routes from the sidebar:

- `/` — **Overview** (stats + savings vs Western Union)
- `/send` — **Send** (fiat or Phantom-wallet path)
- `/receive` — **Claim** (paste a token; Phantom-connected receivers also get a cNFT receipt)
- `/recurring` — **Recurring schedules** (demo cadence is accelerated)
- `/history` — **All remittances** with on-chain links
- `/agent` — **Operator console** (PIN-gated; default `1234`)

---

## 7. Troubleshooting

- **`ECONNREFUSED 127.0.0.1:8787`** — relayer not running. `npm run dev:relayer` in another terminal.
- **Wallet won't connect** — install Phantom and switch its network to **devnet** (Settings → Developer Settings → Testnet Mode → Devnet).
- **`/api/claim` returns `nftTx: null` even with key set** — `MERKLE_TREE_ADDRESS` and `COLLECTION_MINT` must both be set, and the relayer keypair needs SOL on devnet to pay for the mint.
- **Stale port 8787** — `lsof -i :8787` to find a stale process; kill and restart.
- **`npm install` is slow / lockfile churn** — delete `node_modules` and `package-lock.json`, then `npm install` again. We pin `react`/`react-dom` to 19.2.5 in the root `overrides`; respect the lockfile in PRs.

---

## 8. Anchor program (only if you're touching `programs/escrow`)

Most teammates can ignore this. If you need to rebuild/deploy:

```bash
# one-time
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
npm install -g @coral-xyz/anchor-cli

# in programs/escrow
anchor build
anchor deploy --provider.cluster devnet
```

If you redeploy with a new program ID, update **both**:

- `programs/escrow/programs/escrow/src/lib.rs` (the `declare_id!` macro)
- `apps/relayer/src/solana.ts` (the `PROGRAM_ID` constant)
- `apps/web/src/App.tsx` (the `PROGRAM_ID` constant)
