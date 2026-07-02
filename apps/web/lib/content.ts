export type NavItem = { label: string; href: string };

export const site = {
  name: "payphone.cc",
  brand: "Payphone",
  domain: "payphone.cc",
  tagline: "Non-Custodial Cross-Asset Orchestration",
  legalName: "Old West Solutions LLC",
  whitepaperVersion: "6.0",
  enterpriseVersion: "6.0",
  registeredOffice: "1010 Pine Street, St. Louis, MO 63101",
  regulatoryRef: "PP-2847-US",
} as const;

export const topNav: NavItem[] = [
  { label: "Orchestration", href: "/#orchestration" },
  { label: "Features", href: "/#features" },
  { label: "Fees", href: "/#fees" },
  { label: "Download", href: "/download" },
];

export const hero = {
  title: "Intent. Route. Execute. Settle.",
  subtitle:
    "Payphone is a non-custodial cross-asset orchestration layer on top of communications, escrow, and Circle USDC. Say what you want—\"50 MATIC to USDC in my wallet\"—and Payphone evaluates paths across Uniswap, Stellar SDEX, Circle, and BTCPay, shows every fee before you confirm, and executes step by step. We never hold your keys or your assets.",
  disclaimer: "* Network fees are passed through at provider cost. Payphone's orchestration service fee is 0.5% per executed intent.",
  ctaPrimary: "Download App",
  ctaPrimaryHref: "/download",
  ctaSecondary: "Create account",
  ctaSecondaryHref: "/account",
  chatBubbles: {
    outgoing: { text: "Route 0.05 BTC → USDC for escrow ctr_abc 11:53", read: true },
    incoming: {
      name: "Payphone",
      text: "Best path: bridge + Circle · 0.5% service fee · confirm in 28s 11:59",
      reactions: ["✓"],
    },
  },
  sessionCard: {
    title: "Start with intent",
    subtitle: "Register with email and phone—then swap, call, and settle",
    disclaimer:
      "Non-custodial: your Stellar keys and wallet signatures stay on your device. Payphone coordinates execution only.",
    cta: "Create account",
    loginPrompt: "Already registered?",
    loginLink: "Log in",
  },
};

export const introBand = {
  title:
    "Like a travel platform for money—Payphone does not own the airlines. We read your intent, quote optimal paths across external networks, and orchestrate execution while cryptographic authority stays with you.",
};

export const featureSections = [
  {
    id: "orchestration",
    eyebrow: "V6 orchestration layer",
    title: "One intent, every asset",
    body: "Submit a canonical intent: asset in, amount, asset out, purpose, urgency. The Haskell intent engine validates. The routing engine quotes Uniswap V3, Stellar path payments, Circle transfers, and BTC bridges concurrently. You see the full fee breakdown—0.5% service fee plus network fees at cost—before anything executes.",
    cta: "Download desktop",
    ctaHref: "/download",
    imageSide: "right" as const,
    accent: "bg-luxury-dark",
    dark: true as const,
  },
  {
    id: "noncustodial",
    eyebrow: "Non-custodial by design",
    title: "We coordinate—we never custody",
    body: "Stellar secrets stay on your device. Circle programmable wallets are yours on mainnet. Uniswap swaps are signed by your wallet. BTCPay invoices go to your Bitcoin wallet. Payphone's routing and execution orchestrator calls external APIs in sequence; it does not maintain a balance sheet of user funds.",
    cta: "Security model",
    ctaHref: "/#privacy",
    imageSide: "left" as const,
    accent: "bg-luxury-black",
    dark: true as const,
  },
  {
    id: "voice",
    eyebrow: "Communications + payments",
    title: "Call, message, and move value",
    body: "RingCentral-style phone and iMessage-style threads sit beside a Cash App–style USDC wallet. Masked lines, tolls, and peer payments flow through the same payment layer as escrow, procurement, and cross-asset swaps.",
    cta: "See features",
    ctaHref: "/#features",
    imageSide: "right" as const,
    accent: "bg-luxury-dark",
    dark: true as const,
  },
  {
    id: "escrow",
    eyebrow: "Escrow & procurement",
    title: "Fiverr-style orders with on-chain settlement",
    body: "Fund escrow contracts, release milestones, post job bonds, and resolve disputes through admin arbitration. Appeals cost $10 USDC. Every outcome is written to MongoDB and the immutable ledger event chain.",
    cta: "Create account",
    ctaHref: "/account",
    imageSide: "left" as const,
    accent: "bg-luxury-black",
    dark: true as const,
  },
  {
    id: "fees",
    eyebrow: "Transparent fee architecture",
    title: "0.5% service fee. No hidden spread.",
    body: "Service fee: 0.5% of transaction value—Payphone's only orchestration revenue. Network fees: passed through exactly as quoted by Uniswap, Stellar, Circle, or bridge providers. Quotes expire in 30 seconds; execution requires explicit confirmation after you review the breakdown.",
    cta: "Download",
    ctaHref: "/download",
    imageSide: "right" as const,
    accent: "bg-luxury-dark",
    dark: true as const,
  },
  {
    id: "ledger",
    eyebrow: "Auditable execution",
    title: "Immutable ledger with hash chains",
    body: "Every intent, route selection, step execution, and fee collection emits an append-only ledger event. SHA-256 hash chains link events per intent—verify integrity with GET /api/ledger/verify/:intentId.",
    cta: "For developers",
    ctaHref: "/download",
    imageSide: "left" as const,
    accent: "bg-luxury-black",
    dark: true as const,
  },
] as const;

export const executiveSummary = {
  title: "Payphone V6 — financial OS, not another wallet",
  paragraphs: [
    "Version 6 adds non-custodial cross-asset orchestration to the existing Payphone stack: masked calls, Haskell escrow, Circle mainnet USDC, BTCPay storage, bonds, and admin dispute resolution all continue to work.",
    "New capability: express financial intent in plain terms (BTC → USDC, MATIC → USDC, USDC → XLM) and let Payphone route through the optimal path with deterministic fees and real-time execution status.",
    "Built for desktop users funding Circle wallets without juggling DEXs, and for SDK integrators (AutoEquityGroup, marketplaces) whose end users hold any asset but need USDC settlement.",
  ],
};

export const problemMarkets = [
  {
    title: "Cross-border traders",
    body: "Hold BTC or MATIC but need USDC in Circle to fund escrow—one intent, one confirmation, full fee disclosure.",
  },
  {
    title: "AutoEquityGroup & dealers",
    body: "Vehicle transactions settle in USDC while buyers may hold heterogeneous assets. SDK intents route to escrow automatically.",
  },
  {
    title: "Marketplace operators",
    body: "Sellers answer calls in minutes, settle milestones on-chain, and appeal disputes through a Fiverr-style admin process.",
  },
  {
    title: "Developers",
    body: "Intent → route → execute APIs with ledger verification. Non-custodial guarantees documented and enforced at the API layer.",
  },
] as const;

export const architectureServices = [
  { name: "Intent engine (:4008)", body: "Haskell (or Node shim): validates asset pairs, amounts, purpose—returns CanonicalIntent." },
  { name: "Routing engine (:4009)", body: "Rust (or Node shim): concurrent provider quotes, path scoring by urgency, 30s quote window." },
  { name: "Execution orchestrator (:4011)", body: "Step-by-step adapter dispatch with retries, partial completion handling, Redis events." },
  { name: "Ledger service (:4012)", body: "Append-only SHA-256 hash chain for every intent and execution step." },
  { name: "Payment layer", body: "V5 unified Payment objects—transfers, escrow, procurement, swaps, appeals." },
  { name: "Communications", body: "Telephony engine, masked lines, messaging, BTCPay $9.99/mo storage." },
] as const;

export const caseStudies = [
  {
    title: "MATIC → USDC wallet fund",
    result: "~3 second Uniswap path",
    body: "User submits intent for 50 MATIC → USDC. Routing selects Uniswap V3 on Polygon. Fee breakdown shown. User confirms. USDC arrives in Circle wallet. Ledger records 8 events.",
  },
  {
    title: "USDC → XLM peer payment",
    result: "Stellar path payment",
    body: "Send USDC from Circle through Stellar SDEX to @alice. Non-custodial: transaction envelope signed on device.",
  },
  {
    title: "Escrow + dispute",
    result: "Admin arbitration",
    body: "Buyer funds escrow via intent purpose fund_escrow. Seller delivers. Dispute filed. Admin resolves. Outcome in MongoDB + ledger.",
  },
] as const;

export const differentiators = [
  { title: "Non-custodial", body: "No pooled user funds. No private key storage. Coordinator, not carrier.", icon: "shield" },
  { title: "Intent-based", body: "One form: asset in, asset out, purpose, urgency. Everything else is orchestration.", icon: "speed" },
  { title: "Transparent fees", body: "0.5% service fee + network pass-through. Shown before execution. No spread markup.", icon: "chart" },
  { title: "Full stack", body: "Calls, escrow, procurement, bonds, swaps, and ledger in one desktop app.", icon: "layers" },
] as const;

export const designPrinciples = [
  { title: "Coordinator not carrier", body: "Payphone routes and executes through external providers—you hold the keys." },
  { title: "Confirm before execute", body: "30-second quote window. userConfirmation: true required on every execution." },
  { title: "Replayable audit trail", body: "Hash-chained ledger events reconstruct any transaction timeline." },
  { title: "Extend V5, don't replace", body: "Telephony, escrow, Circle, BTCPay, and payment layer remain first-class." },
] as const;

export const useCases = [
  "Fund Circle USDC wallet from MATIC, ETH, or BTC without leaving Payphone",
  "Cross-chain peer payments USDC → XLM to Stellar names",
  "AutoEquityGroup vehicle escrow with heterogeneous buyer assets",
  "International calls with masked lines and USDC toll settlement",
  "Procurement milestones, job bonds, and admin dispute resolution",
] as const;

export const businessModel = {
  headline: "Monetization without hidden spread",
  detail:
    "Orchestration service fee: 0.5% per executed cross-asset intent. Plus existing V5 revenue: 5% escrow/procurement settlement, 1% P2P, 10% toll commission, $10 appeals, $9.99/mo BTCPay storage.",
  tiers: [
    "Cross-asset intent execution: 0.5% service fee",
    "Escrow & procurement settlement: 5% platform fee",
    "P2P USDC transfer: 1% platform fee",
    "Storage & comms: $9.99/mo via BTCPay Bitcoin",
  ],
} as const;

export const downloadPlatforms = [
  {
    id: "windows",
    name: "Windows",
    version: "1.0.0",
    requirements: "Windows 10 or later (64-bit)",
    filename: "Payphone_1.0.0_x64_en-US.msi",
    href: "/downloads/Payphone_1.0.0_x64_en-US.msi",
    altHref: "/downloads/Payphone_1.0.0_x64-setup.exe",
    altLabel: "NSIS installer (.exe)",
    icon: "windows",
    available: true,
  },
  {
    id: "macos",
    name: "macOS",
    version: "1.0.0",
    requirements: "macOS 11 Big Sur or later (Intel & Apple Silicon)",
    filename: "Payphone_1.0.0_universal.dmg",
    href: "/download#macos",
    icon: "apple",
    available: false,
  },
] as const;

export const desktopFeatures = [
  "Swap panel: MATIC/BTC/ETH → USDC/XLM with route preview and fee breakdown",
  "Routes panel: live execution status and ledger hash-chain viewer",
  "Opens to Phone—dial pad, masked calls, messaging",
  "Circle mainnet USDC wallet + Stellar identity on device",
  "Escrow orders, procurement milestones, job bonds, admin arbitration",
  "0.5% orchestration fee shown before every cross-asset execution",
  "$9.99/mo storage via BTCPayServer",
] as const;

export type DirectoryEntry = {
  id: string;
  displayName: string;
  title: string;
  bio: string;
  rateLabel: string;
  availability: "Available" | "By appointment";
  rating: number;
  reviews: number;
  verification: string;
};

export const directory: DirectoryEntry[] = [
  {
    id: "mercer-legal",
    displayName: "Silas Mercer",
    title: "Attorney at Law",
    bio: "Consultations through Payphone—private line, USDC settlement, escrow-ready.",
    rateLabel: "$2.40 / minute",
    availability: "Available",
    rating: 4.9,
    reviews: 128,
    verification: "Verified professional",
  },
  {
    id: "exchange-concierge",
    displayName: "The Exchange Desk",
    title: "Customer liaison",
    bio: "White-glove support for Payphone business and SDK integrators.",
    rateLabel: "Included with plan",
    availability: "Available",
    rating: 5.0,
    reviews: 412,
    verification: "Payphone staff",
  },
  {
    id: "field-engineer",
    displayName: "Regional Support",
    title: "Setup specialists",
    bio: "Intent engine, Circle wallets, and telephony setup on day one.",
    rateLabel: "From $95 / visit",
    availability: "By appointment",
    rating: 4.8,
    reviews: 89,
    verification: "Certified",
  },
];

export function getDirectoryEntry(id: string): DirectoryEntry | undefined {
  return directory.find((e) => e.id === id);
}

export const heritageTimeline = [
  { year: "1882", event: "Southwestern Bell Telephone Company chartered in Missouri." },
  { year: "2024", event: "Old West Solutions LLC launches payphone.cc." },
  { year: "2025", event: "V5 payment layer, escrow, Circle mainnet, Supabase auth." },
  { year: "Today", event: "V6 non-custodial cross-asset orchestration—Intent · Route · Execute." },
] as const;

export const footerColumns = [
  {
    title: "Product",
    links: [
      { label: "Orchestration", href: "/#orchestration" },
      { label: "Features", href: "/#features" },
      { label: "Fees", href: "/#fees" },
      { label: "Download", href: "/download" },
    ],
  },
  {
    title: "Get started",
    links: [
      { label: "Download for Windows", href: "/download#windows" },
      { label: "Create account", href: "/account" },
      { label: "Log in", href: "/account" },
      { label: "Business", href: "/business" },
    ],
  },
  {
    title: "Developers",
    links: [
      { label: "Intent API", href: "/download" },
      { label: "Routing API", href: "/download" },
      { label: "Ledger verify", href: "/download" },
      { label: "Support", href: "/support" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/heritage" },
      { label: "Old West Solutions", href: "/heritage" },
      { label: "Privacy", href: "/support#privacy" },
      { label: "Terms", href: "/support#terms" },
    ],
  },
] as const;

export const professionalComms = {
  eyebrow: "V6 orchestration",
  title: "Cross-asset flows without custody risk",
  lead: executiveSummary.paragraphs[0],
  body: executiveSummary.paragraphs[1],
  features: differentiators.map((d) => d.title),
  idealFor: useCases.slice(0, 4),
  cta: "See orchestration",
  ctaHref: "/#orchestration",
} as const;

export const architectureTiers = architectureServices.map((s, i) => ({
  tier: i + 1,
  name: s.name,
  body: s.body,
}));

export const whyAnonymity = problemMarkets.map((m) => m.title);

export const quickActions = [
  { label: "Download", href: "/download", icon: "download" },
  { label: "Orchestration", href: "/#orchestration", icon: "signal" },
  { label: "Fees", href: "/#fees", icon: "shield" },
  { label: "Account", href: "/account", icon: "building" },
  { label: "Support", href: "/support", icon: "alert" },
] as const;

export const services = differentiators.map((d) => ({
  title: d.title,
  body: d.body,
  href: "/#orchestration",
}));
