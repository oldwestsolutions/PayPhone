export type NavItem = { label: string; href: string };

export const site = {
  name: "payphone.cc",
  brand: "Payphone",
  domain: "payphone.cc",
  tagline: "Verified-identity comms microservice",
  legalName: "Old West Solutions LLC",
  whitepaperVersion: "1.0",
  registeredOffice: "1010 Pine Street, St. Louis, MO 63101",
  regulatoryRef: "PP-2847-US",
} as const;

export const topNav: NavItem[] = [
  { label: "Platform", href: "/#solution" },
  { label: "Architecture", href: "/#architecture" },
  { label: "Use cases", href: "/#use-cases" },
  { label: "Whitepaper", href: "/#whitepaper" },
  { label: "Directory", href: "/directory" },
  { label: "Integrate", href: "/business" },
];

export const hero = {
  eyebrow: "Old West Solutions LLC · Whitepaper v1.0",
  title: "Anonymous calls. Inherited trust. On-chain settlement.",
  subtitle:
    "A multi-tenant, verified-identity comms microservice powered by WebRTC and blockchain escrow—built for marketplaces that cannot afford PII, central call logs, or reinvented infrastructure.",
  ctaPrimary: "Read the architecture",
  ctaSecondary: "View use cases",
};

export const problemGaps = [
  {
    name: "Twilio / Vonage",
    issue: "PSTN requires caller ID—anonymity breaks for legal and healthcare clients.",
  },
  {
    name: "Calendly / Upland",
    issue: "Booking without comms, reputation, or verified settlement rails.",
  },
  {
    name: "Discord / Telegram",
    issue: "Consumer chat—no professional verification or payment discipline.",
  },
  {
    name: "Custom builds",
    issue: "Every marketplace rebuilds WebRTC, escrow, and reputation from scratch.",
  },
] as const;

export const differentiators = [
  {
    title: "Anonymous peer-to-peer",
    body: "No central call logs, no PII exposure. DID-based authentication replaces passwords.",
    icon: "shield",
  },
  {
    title: "Reputation inheritance",
    body: "Read-only trust from parent ecosystems—Centuries Mutual, consulting networks, healthcare panels.",
    icon: "trust",
  },
  {
    title: "Multi-tenant deploy",
    body: "GitLab Runners, isolated Docker namespaces, dedicated API endpoints per ecosystem.",
    icon: "layers",
  },
  {
    title: "Blockchain settlement",
    body: "Atomic escrow, transparent 5% platform fee, duration consensus—no intermediaries.",
    icon: "chain",
  },
] as const;

export const architectureTiers = [
  {
    tier: 1,
    name: "Multi-tenant deployment",
    body: "GitLab Runners deploy isolated instances per ecosystem. Docker separation, dedicated DB namespaces, shared STUN/TURN with isolated session state.",
  },
  {
    tier: 2,
    name: "DID authentication",
    body: "Every API call signed with ed25519. Server validates signatures without learning identity—e.g. did:key:z6MkhaXgBZDvotDkL5257faWrQqoWhvsbvBLq39R4QcN8J7h",
  },
  {
    tier: 3,
    name: "Reputation gating",
    body: "Read-only thresholds from parent DBs or smart contracts. No reputation stored in payphone—always fresh from source of truth.",
  },
  {
    tier: 4,
    name: "WebRTC signaling",
    body: "STUN for NAT traversal, TURN fallback only when needed. Dumb relay passes SDP/ICE—media never touches our servers.",
  },
  {
    tier: 5,
    name: "On-chain settlement",
    body: "Escrow before the call, atomic release on completion, client+server duration consensus, 5% fee on-chain.",
  },
] as const;

export const designPrinciples = [
  {
    title: "Dumb relay philosophy",
    body: "Signaling orchestrates connections; encrypted SDP/ICE only. DTLS-SRTP peer-to-peer—no content liability.",
  },
  {
    title: "No central ledger",
    body: "Reputation and KYC live in parent ecosystems. payphone reads, never stores—disposable infrastructure.",
  },
  {
    title: "End-to-end encryption",
    body: "Keys negotiated in the WebRTC handshake. TURN sees encrypted UDP packets only.",
  },
  {
    title: "Atomic settlement",
    body: "Smart contracts eliminate disputes—escrow, auto-release, no chargebacks or manual invoicing.",
  },
] as const;

export const useCases = [
  "Attorney consultations within Centuries Mutual's verified network",
  "Engineering time-for-hire marketplaces",
  "Real estate agent consultation calls",
  "Healthcare consultant sessions (HIPAA-aligned privacy posture)",
  "Freelance expertise across professional verticals",
] as const;

export const businessModel = {
  fee: "5%",
  headline: "Revenue scales with ecosystem adoption",
  detail:
    "Minimal infrastructure costs—a dumb relay and read-only reputation. At 10,000 providers and 100,000 calls monthly, projected platform revenue reaches $250,000/month.",
} as const;

export const whyAnonymity = [
  "Legal consultations requiring jurisdictional privacy",
  "Healthcare sessions beyond traditional phone record risk",
  "Strategic consulting where competitive intelligence is sensitive",
  "Whistleblower representation requiring identity firewalls",
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
    title: "Attorney at Law · Centuries Mutual panel",
    bio: "Consultations for verified marketplace members. Reputation inherits from parent ecosystem; per-second billing with on-chain escrow when live.",
    rateLabel: "$2.40 / minute",
    availability: "Available",
    rating: 4.9,
    reviews: 128,
    verification: "Parent ecosystem KYC",
  },
  {
    id: "exchange-concierge",
    displayName: "The Exchange Desk",
    title: "Priority customer liaison",
    bio: "White-glove routing, billing disputes, and engineer scheduling for Heritage-tier marketplace operators.",
    rateLabel: "Included with plan",
    availability: "Available",
    rating: 5.0,
    reviews: 412,
    verification: "Internal — Payphone staff",
  },
  {
    id: "field-engineer",
    displayName: "Regional Field Engineering",
    title: "Signaling & settlement specialists",
    bio: "GitLab Runner deploys, STUN/TURN tuning, and smart-contract escrow wiring for new tenants.",
    rateLabel: "From $95 / visit",
    availability: "By appointment",
    rating: 4.8,
    reviews: 89,
    verification: "Engineer badge · FCC licensed",
  },
];

export function getDirectoryEntry(id: string): DirectoryEntry | undefined {
  return directory.find((e) => e.id === id);
}

export const quickActions = [
  { label: "Architecture", href: "/#architecture", icon: "signal" },
  { label: "DID auth", href: "/#architecture", icon: "shield" },
  { label: "Settlement", href: "/#use-cases", icon: "receipt" },
  { label: "Integrate", href: "/business", icon: "handset" },
  { label: "Directory", href: "/directory", icon: "user" },
  { label: "Support", href: "/support", icon: "alert" },
] as const;

export const services = differentiators.map((d) => ({
  title: d.title,
  body: d.body,
  href: "/#solution",
}));

export const heritageTimeline = [
  { year: "1882", event: "Southwestern Bell Telephone Company chartered in Missouri." },
  { year: "1984", event: "Bell System divestiture; regional operating companies emerge." },
  { year: "2024", event: "Old West Solutions LLC publishes payphone.cc whitepaper v1.0." },
  { year: "Today", event: "Multi-tenant WebRTC microservice with on-chain settlement." },
] as const;

export const footerColumns = [
  {
    title: "Platform",
    links: [
      { label: "Solution", href: "/#solution" },
      { label: "Architecture", href: "/#architecture" },
      { label: "Use cases", href: "/#use-cases" },
      { label: "Whitepaper", href: "/#whitepaper" },
    ],
  },
  {
    title: "Developers",
    links: [
      { label: "Integrate", href: "/business" },
      { label: "Directory", href: "/directory" },
      { label: "Support", href: "/support" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Heritage", href: "/heritage" },
      { label: "Regulatory", href: "/support#regulatory" },
      { label: "Account", href: "/account" },
    ],
  },
] as const;
