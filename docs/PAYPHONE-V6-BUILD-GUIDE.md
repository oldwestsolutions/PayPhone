# Payphone V6 — Build Guide

Non-custodial cross-asset orchestration (whitepaper V6.0). This repo ships **working Node/Rust shims** that implement the same APIs as the Haskell/Rust production services described in the whitepaper.

## Architecture

| Service | Port | Location | Role |
|---------|------|----------|------|
| API Gateway | 4000 | `apps/gateway` | Auth, payment layer, proxies to all engines |
| Intent engine | 4008 | `services/intent-shim` | Validate `RawIntent` → `CanonicalIntent` |
| Routing engine | 4009 | `services/routing-engine` | Path quotes, fee breakdown, route plans |
| Execution orchestrator | 4011 | `services/execution-orchestrator` | Step execution, retries, ledger events |
| Ledger service | 4012 | `services/ledger-service` | SHA-256 hash-chain audit log |
| Telephony | 4010 | `services/telephony-shim` | Calls, Stellar names |
| Escrow | 4004 | `services/escrow-shim` | Escrow state machine |

Shared validation logic: `services/intent-engine/lib/intent-core.mjs`  
Shared routing logic: `services/routing-engine/lib/routing-core.mjs`

## Quick start

```powershell
copy .env.example .env
docker compose up -d
npm install
npm run services:dev
npm run desktop:dev
```

Register at http://localhost:3003/account, sign in on desktop, open **Swap** panel.

## End-to-end swap flow

1. Desktop `submit_intent` → `POST /api/intent/submit` → intent engine
2. Desktop `get_route` → `POST /api/routes/evaluate` → routing engine
3. User reviews fee breakdown (0.5% service + network fees)
4. Desktop `confirm_execution` → `POST /api/execute` → orchestrator
5. Ledger events at `GET /api/ledger/intent/:intentId`
6. Verify chain: `GET /api/ledger/verify/:intentId`

## Upgrade path to production Haskell/Rust

| Shim (now) | Production target |
|------------|-------------------|
| `services/intent-shim` | `services/intent-engine` (Haskell, cabal) |
| `services/routing-engine/server.mjs` | `services/routing-engine` (Rust, axum) |
| `services/execution-orchestrator/server.mjs` | `services/execution-orchestrator` (Rust) |

API contracts in whitepaper Sections 5–8 are the target. Shims use identical REST paths (`/v1/intent/*`, `/v1/routes/*`, `/v1/execute/*`).

## Environment

See `.env.example` for `INTENT_ENGINE_URL`, `ROUTING_ENGINE_URL`, `EXECUTION_ORCHESTRATOR_URL`, `LEDGER_SERVICE_URL`, and spot rates (`POLYGON_MATIC_USDC_RATE`, etc.).

Set `POLYGON_RPC_URL` when wiring live Uniswap QuoterV2 in the Rust execution orchestrator.

## Desktop panels (V6)

- **Swap** — `apps/desktop/src/panels/SwapPanel.tsx`
- **Routes** — `apps/desktop/src/panels/RoutingPanel.tsx`
- Tauri commands — `apps/desktop/src-tauri/src/intent.rs`

## Smoke test

```powershell
npm run smoke-test
```

Adds intent → route → execute → ledger verify when services are running.
