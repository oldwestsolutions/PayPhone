# Payphone Escrow Rules Engine (Haskell)

Strict escrow state machine — invalid transitions are rejected at compile/runtime.

## Run (requires GHC + cabal)

```bash
cd services/escrow-engine
cabal run escrow-engine
```

Listens on **http://localhost:4004**

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/contracts` | Create escrow `{ contractId, buyerId, sellerId, amount, currency }` |
| GET | `/contracts/:id` | Get contract |
| POST | `/contracts/:id/transition` | `{ requestType, requesterId }` |

## States

`Draft` → `Funded` → `Active` → `ReleasePending` → `Settled`

Also: `Disputed`, `Cancelled`

## Transitions

| From | Event | Actor |
|------|-------|-------|
| Draft | `fund` | buyer |
| Funded | `activate` | buyer or seller |
| Active | `request_release` | seller |
| ReleasePending | `settle` | buyer |
| Active | `dispute` | buyer or seller |
| Draft/Funded | `cancel` | buyer |
