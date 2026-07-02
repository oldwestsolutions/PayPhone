# PAYPHONE.CC
## Enterprise Communications and Programmable Payment Infrastructure

**Old West Solutions LLC**  
**Version 5.0 — Cursor Build Specification**

A graduate-level technical reference for Cursor-assisted development covering call routing, escrow logic, payment rails, bonding arrangements, voice recording permissions, SDK design, third-party integration, and **programmable procurement and supply chain infrastructure**.

---

## How to Use This Document

When this document is loaded into Cursor's context, treat every section as an implementation requirement unless marked *future capability*. The architecture is not aspirational for Phase 1–2 items listed in Section 24 (Roadmap). Where the document says "the Haskell engine validates X before Y", implement exactly that validation in that sequence.

**Repository implementation status:** Core desktop app, Haskell telephony/escrow engines, Node shims, gateway, and basic supply-chain escrow exist. Bond service, recording consent system, Uniswap adapter, payphone-sdk, MongoDB persistence in shims, and full milestone procurement engine are specified below and tracked in Section 22 (Build Instructions).

---

## Table of Contents

| # | Section |
|---|---------|
| 1 | Purpose and How to Use This Document |
| 2 | Executive Summary |
| 3 | Product Definition and Scope |
| 4 | System Architecture — Complete Topology |
| 5 | Stellar Identity Layer — Complete Logic |
| 6 | Call Routing Engine — Complete Logic |
| 7 | Escrow Engine — Complete State Machine |
| 8 | Bonding Arrangements — Backing Escrow with Collateral |
| **9** | **Programmable Procurement and Supply Chain Infrastructure** *(this file — full text)* |
| 10 | Payment Rails — Circle, BTCPayServer, Uniswap, Stellar |
| 11 | Revenue Model — How Payphone Makes Money |
| 12 | Voice Recording System — Local Device Permissions and Storage |
| 13 | Wallet and Settlement Layer — Complete Flow |
| 14 | Desktop Application — Panel by Panel Specification |
| 15 | Database Design — MongoDB Collections (Complete) |
| 16 | API Specification — Every Endpoint |
| 17 | Event Schema — Redis Pub/Sub |
| 18 | SDK Design — payphone-sdk npm Package |
| 19 | AutoEquityGroup.com Integration Pattern |
| 20 | Security Architecture |
| 21 | Open Source Library Manifest |
| 22 | Docker Development Environment |
| 23 | Cursor Step-by-Step Build Instructions |
| 24 | Risk Analysis |
| 25 | Roadmap |
| 26 | Appendix A: Haskell Type Definitions |
| 27 | Appendix B: Solidity Contract Stubs |
| 28 | Appendix C: Glossary |

Sections 1–8 and 10–28 follow the PayPhone.cc V5.0 base specification (communications, escrow, bonds, payments, SDK, deployment). Section 9 below extends the platform from payment-linked communications into **programmable economic coordination across procurement and logistics lifecycles**.

---

## 9. Programmable Procurement and Supply Chain Infrastructure

### 9.1 Beyond Payments: A Programmable Agreement Engine

PayPhone is not only a payment network. It is a **programmable agreement engine** capable of coordinating financial commitments between multiple parties throughout a procurement and logistics lifecycle.

Traditional procurement fractures across disconnected systems:

- Purchase orders live in ERP or email
- Invoices sit in accounting software
- Shipping updates arrive from carriers and TMS portals
- Escrow and prepayment require separate fintech integrations
- Approvals flow through workflow tools with no settlement link
- Disputes lack a single authoritative audit trail tied to money movement

PayPhone unifies these workflows into a **single programmable transaction lifecycle**. Every commercial commitment becomes a verifiable state machine—not a static PDF invoice awaiting manual reconciliation.

The existing `SupplyChainEscrow` type in `services/escrow-engine/Escrow/SupplyChain.hs` (buyer → supplier, fund → ship → confirm_delivery → settle) is the seed of this model. The procurement layer extends it into **multi-milestone, multi-party Programmable Commitments** with partial releases, external system hooks, and immutable event records.

### 9.2 Programmable Commitments

A **Programmable Commitment** is a digitally signed agreement that specifies:

| Field | Description |
|-------|-------------|
| Parties | Buyer, seller, and optional roles: distributor, inspector, carrier, lender, insurer, mediator |
| Goods or services | SKU, quantity, description, HS codes for trade |
| Payment amount | Total USDC (or settlement asset) locked or staged |
| Currency | Display and settlement currency (USDC primary; fiat reference optional) |
| Settlement asset | Circle USDC on Polygon (current); Stellar USDC Phase 3 |
| Delivery milestones | Ordered stages with release percentages and entry conditions |
| Inspection requirements | Who must attest, evidence types, timeout rules |
| Approval requirements | Multi-party signatures before state transitions |
| Escrow rules | Fund timing, partial release, cancellation, dispute freeze |
| Expiration dates | PO expiry, shipment windows, inspection SLAs |
| Dispute resolution rules | Mediator role, proxy-authoritative evidence (carrier POD, IoT) |
| Automatic payment conditions | Predicates that trigger release without manual settle click |

Each commitment is:

1. **Created** as a typed escrow contract (`contract_type: "supply_chain"` or `"procurement"`)
2. **Signed** by parties using Stellar ed25519 (terms hash + timestamp)
3. **Funded** via Circle programmable wallets
4. **Advanced** only when the Haskell escrow engine validates the transition
5. **Settled** in tranches per milestone configuration
6. **Audited** via MongoDB documents + Redis `payphone:procurement:*` events

MongoDB collection (new): `programmable_commitments`

```text
commitment_id          String (UUID)
contract_id            String (links escrow_contracts)
parties                [{ role, stellar_name, circle_wallet_id }]
line_items             [{ sku, description, quantity, unit_price }]
total_amount           Number
currency               String
milestones             [{ id, name, release_pct, conditions[], status }]
approvals_required     [{ role, stellar_name, required_for_transition }]
inspection_rules       { inspector_role, evidence_types[], sla_hours }
escrow_rules           { fund_on_create, partial_release, cancel_policy }
expires_at             Number
dispute_policy         String
signatures             [{ party_id, payload_hash, ed25519_signature }]
status                 String (draft | active | completed | disputed | cancelled)
created_at             Number
```

### 9.3 Procurement as a State Machine

Every procurement transaction is a **verifiable state machine**, not a simple invoice. States extend the core escrow machine (Section 7) with procurement-specific transitions:

```text
Purchase Order Created
        ↓
Buyer Funds Escrow
        ↓
Vendor Accepts Order
        ↓
Manufacturing Begins          ← milestone release (e.g. 20%)
        ↓
Shipment Dispatched             ← milestone release (e.g. 30%)
        ↓
Shipment Arrives at Port
        ↓
Customs Clearance
        ↓
Distribution Center Receipt
        ↓
Buyer Inspection
        ↓
Acceptance
        ↓
Automatic Settlement            ← final tranche (e.g. 20%)
```

**Every transition** generates:

- An immutable Redis event on `payphone:procurement:{event_type}`
- A row in `commitment_audit_log` (MongoDB)
- Optional webhook delivery to SDK integrators (ERP, WMS, TMS)
- Platform fee accrual per settled tranche (5% of released amount, Section 11)

Haskell module (new): `Escrow/Procurement.hs` — validates milestone transitions, ensures cumulative release ≤ funded amount, enforces approval quorum.

Gateway orchestration: on valid transition, execute Circle partial transfers from commitment escrow wallet → beneficiary wallets per milestone `release_pct`.

### 9.4 Milestone-Based Payments

Milestone percentages and conditions are **fully programmable** at commitment creation. Example: $100,000 equipment purchase

| Milestone | Release % | Amount | Condition |
|-----------|-----------|--------|-----------|
| Production start | 20% | $20,000 | Supplier attests `manufacturing_begun` + optional IoT signal |
| Goods shipped | 30% | $30,000 | Carrier POD or TMS webhook `shipment_dispatched` |
| Post-inspection | 30% | $30,000 | Inspector role signs `inspection_passed` |
| Final acceptance | 20% | $20,000 | Buyer `accept` or auto-accept after SLA |

Implementation notes:

- `release_pct` across milestones must sum to ≤ 100%; remainder held until final acceptance or refunded on cancel
- Each release calls `platform_fee.rs` for 5% of **that tranche's** released amount
- Bonds (Section 8) may attach to the parent `contract_id`; forfeiture follows dispute outcome on any milestone

### 9.5 Example Procurement Workflows

#### Manufacturer → Distributor → Retailer

Three-party chain: manufacturer funds raw materials escrow; distributor confirms receipt and resells; retailer final acceptance triggers last tranche. PayPhone links three `programmable_commitments` via `parent_commitment_id` for cascade settlement.

#### Government purchasing

Formal inspection and multi-approver quorum (procurement officer + legal + finance). All approvals are Stellar-signed events stored in `commitment_audit_log`. Supports regulatory export of full payment traceability.

#### Enterprise procurement

Integrates with SAP/Oracle/NetSuite via SDK webhooks: PO number in commitment metadata; `PO_CREATED` external event can auto-create Draft commitment via `POST /api/procurement/commitments`.

#### Construction contracts

Progress billing tied to site inspection milestones; lien waiver document hash stored as evidence token before release.

#### International trade

Customs clearance milestone requires broker attestation; currency display in USD, settlement in USDC; future: trade finance lender as fourth party with conditional release.

#### Equipment purchasing

Serial number and warranty start date required on `accept` transition; links to AutoEquityGroup-style high-value asset flows (Section 19).

#### Inventory replenishment

WMS signals `stock_below_threshold` → SDK auto-creates replenishment commitment → supplier accepts → ship → DC receipt → auto-settle.

#### Wholesale commerce

Volume tiers encoded in `line_items`; dynamic pricing adjustments via amendment transition (new signed addendum, escrow top-up).

#### Freight and logistics

Carrier as third party; freight amount as sub-milestone; TMS webhook `DELIVERED` unlocks inspection milestone.

#### Vendor management

Vendor scorecards derived from on-time milestone completion rate; bonds returned faster for high-trust vendors.

### 9.6 Multi-Party Approvals

Approvals may involve:

- **Buyer** — fund, accept, dispute
- **Supplier** — accept order, attest production/ship
- **Logistics provider** — dispatch, delivery proof
- **Inspector** — quality attestation (third-party or buyer delegate)
- **Lender** — supply chain finance: release only after draw confirmation
- **Insurer** — claim freeze on disputed damage milestone
- **Mediator** — dispute resolution (operator or DAO Phase 4)

Approval model:

```text
POST /api/procurement/commitments/:id/approve
Body: { milestone_id, approver_id, signature, evidence_tokens[] }
```

Gateway verifies ed25519 signature against registered public key. Haskell engine checks `approvals_required` quorum before allowing `transition` to next milestone state.

### 9.7 Enterprise System Integration (Orchestration Layer)

PayPhone is an **orchestration layer**, not a replacement for ERP, WMS, TMS, inventory, accounting, carriers, or core banking.

External systems communicate via:

| Integration | Direction | Mechanism |
|-------------|-----------|-----------|
| ERP (SAP, Oracle, NetSuite) | Inbound PO / outbound settlement | REST + webhooks |
| WMS | Inbound receipt events | Webhook `DC_RECEIPT` |
| TMS | Inbound ship/deliver | Webhook `SHIPMENT_*` |
| Inventory | Low-stock triggers | SDK `procurement.createReplenishment()` |
| Accounting | Outbound journal entries | Webhook `MILESTONE_SETTLED` with GL codes in metadata |
| Carriers (FedEx, Maersk APIs) | Tracking → milestone unlock | Signed carrier webhooks |
| Banking | Fiat settlement reference | Metadata only; USDC via Circle |

Event stream: SDK `payphone.events.subscribe({ channels: ['procurement'] })`

Redis channels:

- `payphone:procurement:COMMITMENT_CREATED`
- `payphone:procurement:MILESTONE_REACHED`
- `payphone:procurement:APPROVAL_RECORDED`
- `payphone:procurement:TRANCHE_SETTLED`
- `payphone:procurement:COMMITMENT_COMPLETED`
- `payphone:procurement:COMMITMENT_DISPUTED`

### 9.8 Immutable Ledger and Audit

The combined MongoDB + Redis event history provides:

- **Complete audit history** — every transition, approval, and transfer ID
- **Payment traceability** — Circle `circle_transfer_id` per tranche
- **Regulatory reporting** — export `GET /api/procurement/commitments/:id/audit`
- **Vendor accountability** — milestone SLA breach flags
- **Procurement transparency** — multi-party read access via commitment ID + role
- **Financial reconciliation** — matches ERP invoice to on-chain/Circle settlement

### 9.9 Agreement Types Supported by One Engine

The same programmable agreement engine supports:

- Purchase orders
- Vendor contracts
- Service agreements
- Freight payments
- Equipment leases
- Marketplace transactions (AutoEquityGroup, wholesale)
- Escrow agreements (standard + marketing + supply chain)
- Cross-border commerce
- Digital asset settlement (USDC)
- Traditional fiat settlement (display + BTCPay for subscriptions; USDC for commitment body)

### 9.10 API Surface (Procurement Extensions)

Gateway endpoints (add to Section 16):

```text
POST   /api/procurement/commitments              Create programmable commitment
GET    /api/procurement/commitments              List for current user / role
GET    /api/procurement/commitments/:id          Detail + milestone status
POST   /api/procurement/commitments/:id/fund     Fund escrow
POST   /api/procurement/commitments/:id/transition  Milestone transition
POST   /api/procurement/commitments/:id/approve  Record approval signature
GET    /api/procurement/commitments/:id/audit    Full audit export
POST   /api/sdk/procurement/commitments          SDK-authenticated create

Webhooks (outbound to integrators):
  PROCUREMENT_MILESTONE_REACHED
  PROCUREMENT_TRANCHE_SETTLED
  PROCUREMENT_COMMITMENT_COMPLETED
  PROCUREMENT_COMMITMENT_DISPUTED
```

SDK module (new): `packages/payphone-sdk/src/procurement.ts`

```typescript
const commitment = await payphone.procurement.create({
  buyerId: 'acme-corp',
  supplierId: 'global-parts',
  lineItems: [{ sku: 'SKU-4401', quantity: 500, unitPrice: 12.5 }],
  milestones: [
    { name: 'production', releasePct: 20, condition: 'supplier_attest' },
    { name: 'shipped', releasePct: 30, condition: 'carrier_pod' },
    { name: 'inspected', releasePct: 30, condition: 'inspector_sign' },
    { name: 'accepted', releasePct: 20, condition: 'buyer_accept' },
  ],
  expiresAt: Date.now() + 90 * 86400_000,
});
```

### 9.11 Desktop UI Extensions

**EscrowPanel** — Supply Chain tab: upgrade to show milestone timeline, approval status, and tranche settlement history.

**New: ProcurementPanel.tsx** (Phase 2)

- Commitment list with milestone progress bars
- Create commitment wizard (parties, line items, milestones)
- Approval inbox for inspector/logistics roles
- Audit export button

**DashboardPanel** — Active commitments count; procurement volume this month.

### 9.12 Build Instructions (Procurement Phase)

Add to Section 23 (Cursor Build Instructions) as **Phase 2.5**:

1. Extend `Escrow/SupplyChain.hs` → `Escrow/Procurement.hs` with milestone types and partial release validation
2. Add `programmable_commitments` and `commitment_audit_log` MongoDB collections
3. Implement procurement routes in gateway + escrow-shim parity
4. Wire partial Circle transfers in gateway settlement handler
5. Emit `payphone:procurement:*` Redis events
6. Add `procurement.ts` to payphone-sdk
7. Extend smoke test: create commitment → fund → two milestones → settle tranches

### 9.13 Future Capabilities

*These are roadmap items (Section 25), not Phase 1–2 requirements:*

- **AI-assisted procurement recommendations** — spend analytics on milestone history
- **Automated supplier selection** — RFQ commitments with bond-backed bids
- **Dynamic pricing negotiations** — amend commitment with signed price deltas
- **Real-time inventory-triggered purchasing** — WMS → SDK auto-commitment
- **IoT-triggered payment releases** — cold chain, manufacturing line signals
- **Carbon and ESG reporting** — milestone metadata for emissions attestations
- **Supply chain financing** — lender as fourth party with conditional tranche release
- **Tokenized invoices** — NFT or ERC-1155 receipt linking to `commitment_id`
- **Embedded trade finance** — Circle + partner bank draw against milestone

### 9.14 Positioning

PayPhone is a **programmable economic coordination platform**. It automates not only the movement of money, but the **execution of commercial agreements** across the global supply chain—from a salvage vehicle negotiation on AutoEquityGroup to a multi-port container shipment with customs, inspection, and progressive settlement.

Communications (Section 6) establish trust between parties who cannot share phone numbers. Escrow (Section 7) locks value. Bonds (Section 8) back performance. **Procurement (Section 9)** choreographs how that value moves across space and time as real goods and services progress. Payment rails (Section 10) execute the transfers. One engine, one audit trail, one SDK.

---

## Cross-Reference: Supply Chain Escrow in Codebase Today

Current Haskell transitions (`Escrow.SupplyChain`):

| State | Transition | Actor |
|-------|------------|-------|
| Draft | `fund` | Buyer |
| Funded | `ship` | Supplier |
| Active | `confirm_delivery` | Buyer |
| ReleasePending | `settle` | Buyer |
| Active | `dispute` | Either party |
| Draft | `cancel` | Anyone |

Procurement milestones generalize `ship` / `confirm_delivery` into arbitrary ordered stages with partial `settle` at each milestone.

---

## Document Footer

**PAYPHONE.CC** — Old West Solutions LLC  
Version 5.0 — Cursor Build Specification  

Place calls. Move money. Stay anonymous.  
Coordinate procurement. Settle by milestone.  

Build on us: https://docs.payphone.cc  
SDK: https://npmjs.com/package/@oldwestsolutions/payphone-sdk  
Enterprise: enterprise@payphone.cc
