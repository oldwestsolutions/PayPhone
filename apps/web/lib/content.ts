export type NavItem = { label: string; href: string };

export const site = {
  name: "payphone.cc",
  brand: "Payphone",
  domain: "payphone.cc",
  tagline: "International Tele Communications",
  legalName: "Old West Solutions LLC",
  whitepaperVersion: "2.0",
  enterpriseVersion: "3.0",
  registeredOffice: "1010 Pine Street, St. Louis, MO 63101",
  regulatoryRef: "PP-2847-US",
} as const;

export const topNav: NavItem[] = [
  { label: "Features", href: "/#features" },
  { label: "Privacy", href: "/#privacy" },
  { label: "Plans", href: "/business" },
  { label: "For Business", href: "/business" },
];

export const hero = {
  title: "Call anyone. Pay in USDC. Ship with escrow.",
  subtitle:
    "Payphone is a financial communications app—crystal-clear voice, iMessage-style messaging, Circle mainnet wallets, Fiverr-style orders with escrow, procurement milestones, job bonds, and admin arbitration when disputes arise.",
  disclaimer: "* Standard data rates may apply depending on your carrier and region.",
  ctaPrimary: "Download App",
  ctaPrimaryHref: "/download",
  ctaSecondary: "Log in",
  ctaSecondaryHref: "/account",
  chatBubbles: {
    outgoing: { text: "Are you free to talk now? 11:53", read: true },
    incoming: {
      name: "Alex",
      text: "Yes — calling you in a minute! 11:59",
      reactions: ["👍", "❤️"],
    },
  },
  sessionCard: {
    title: "Get your line",
    subtitle: "Enter your mobile number",
    disclaimer:
      "By continuing, you agree to receive verification codes and service updates. See our Privacy Policy and Terms.",
    cta: "Continue",
    loginPrompt: "Already have an account?",
    loginLink: "Log in",
  },
};

export const introBand = {
  title:
    "One app for calls, USDC payments, escrow orders, procurement, and bonds—every value flow routed through a unified payment layer with transparent platform fees.",
};

export const featureSections = [
  {
    id: "voice",
    eyebrow: "Crystal-clear calling",
    title: "Hear every word, wherever you are",
    body: "Place calls over Wi‑Fi or mobile data with the reliability you expect from a premium phone service. No crackling lines. No dropped conversations when it matters most.",
    cta: "See how it works",
    ctaHref: "/#features",
    imageSide: "right" as const,
    accent: "bg-luxury-dark",
    dark: true as const,
  },
  {
    id: "privacy",
    eyebrow: "Your number, your rules",
    title: "Speak freely",
    body: "Share a Payphone line—not your personal mobile number. When the conversation ends, your private number stays private. Perfect for buyers, sellers, clients, and new contacts alike.",
    cta: "Learn about privacy",
    ctaHref: "/#privacy",
    imageSide: "left" as const,
    accent: "bg-luxury-black",
    dark: true as const,
  },
  {
    id: "marketplaces",
    eyebrow: "Built for business",
    title: "Stay close to your customers",
    body: "Respond in minutes, not hours. Payphone helps teams answer faster, sound professional, and never miss the call that closes the sale.",
    cta: "For teams",
    ctaHref: "/business",
    imageSide: "right" as const,
    accent: "bg-luxury-dark",
    dark: true as const,
  },
  {
    id: "messaging",
    eyebrow: "Messaging included",
    title: "Text without the exposure",
    body: "Send and receive messages from the same app you use to call. Keep work and personal threads separate—without juggling two phones.",
    cta: "Explore messaging",
    ctaHref: "/#features",
    imageSide: "left" as const,
    accent: "bg-luxury-black",
    dark: true as const,
  },
  {
    id: "wallet",
    eyebrow: "Circle mainnet USDC",
    title: "Cash App–style wallet on Polygon",
    body: "Every registered user gets a Circle programmable wallet. Send USDC peer-to-peer, pay tolls, and fund escrow—all with platform fees applied consistently through the payment layer.",
    cta: "Create account",
    ctaHref: "/account",
    imageSide: "right" as const,
    accent: "bg-luxury-dark",
    dark: true as const,
  },
  {
    id: "escrow",
    eyebrow: "Orders & escrow",
    title: "Fiverr-style gigs with on-chain settlement",
    body: "Buyers fund escrow; sellers deliver milestones. Disputes go to admin arbitration with claims, appeals ($10 USDC), and outcomes recorded in MongoDB.",
    cta: "See orders",
    ctaHref: "/account",
    imageSide: "left" as const,
    accent: "bg-luxury-black",
    dark: true as const,
  },
  {
    id: "procurement",
    eyebrow: "Procurement & bonds",
    title: "Ship goods with programmable commitments",
    body: "Procurement milestones release USDC when conditions are met. Post job bonds enforced through administrative intervention if work is forfeited.",
    cta: "Download app",
    ctaHref: "/download",
    imageSide: "right" as const,
    accent: "bg-luxury-dark",
    dark: true as const,
  },
] as const;

export const executiveSummary = {
  title: "Why people choose Payphone",
  paragraphs: [
    "Payphone combines RingCentral-style calling with a unified payment layer—every transfer, swap, escrow, and procurement flow becomes a structured payment intent.",
    "Register with email and phone at payphone.cc. Only verified accounts can place calls, move USDC on Circle mainnet, or open escrow orders.",
    "Platform fees are centralized in the payment layer. Disputes and appeals are adjudicated by admin staff—outcomes written to MongoDB for audit and replay.",
  ],
};

export const problemMarkets = [
  {
    title: "International traders",
    body: "Talk to partners in any time zone without exposing your personal mobile number or paying surprise roaming fees.",
  },
  {
    title: "Marketplace sellers",
    body: "Answer buyer questions in real time and sound professional—without giving strangers your private line.",
  },
  {
    title: "Freelancers & consultants",
    body: "One number for client work. Switch off when you're done. Your personal phone stays personal.",
  },
  {
    title: "Remote teams",
    body: "Give every teammate a line that works from anywhere. No desk phones. No complicated installs.",
  },
] as const;

export const architectureServices = [
  { name: "Voice & messaging", body: "Dial pad, calls, SMS-style threads, and masked lines—open the app and call." },
  { name: "Payment layer", body: "All value movement normalized into Payment objects with deterministic state and immutable events." },
  { name: "Circle USDC", body: "Programmable wallets on mainnet—P2P transfers, escrow funding, and settlement." },
  { name: "Escrow & procurement", body: "Milestone releases, programmable commitments, and Fiverr-style order tracking." },
  { name: "Bonds & arbitration", body: "Job collateral, disputes, claims, paid appeals, and admin resolution." },
  { name: "BTCPay storage", body: "$9.99/mo Bitcoin billing for contacts, call history, and comms credits." },
] as const;

export const caseStudies = [
  {
    title: "Auto parts dealer",
    result: "First yard to call wins the sale",
    body: "A buyer texts ten suppliers. With Payphone, the first dealer to pick up closes in under five minutes—without sharing anyone's real number.",
  },
  {
    title: "Auction house",
    result: "Remote bidders get live answers",
    body: "Floor staff answer condition questions instantly. Bidders stay engaged. Conversion goes up.",
  },
  {
    title: "Law office intake",
    result: "Sensitive calls handled discreetly",
    body: "Prospective clients speak with intake staff through a Payphone line—professional, private, and immediate.",
  },
] as const;

export const differentiators = [
  { title: "Private by design", body: "Your personal number stays yours. Share a Payphone line instead.", icon: "shield" },
  { title: "Ready in minutes", body: "Download, sign in, and start calling. No IT department required.", icon: "speed" },
  { title: "Works everywhere", body: "Desktop app for Windows and Mac. Connect from wherever you work.", icon: "layers" },
  { title: "Fair pricing", body: "Pay for the storage you need. No hidden fees. No annual contracts.", icon: "chart" },
] as const;

export const designPrinciples = [
  { title: "Simple to start", body: "If you can use a phone, you can use Payphone." },
  { title: "Private by default", body: "We don't sell your contacts. We don't spam your inbox." },
  { title: "Built to last", body: "Enterprise-grade infrastructure behind a consumer-friendly experience." },
  { title: "Pay your way", body: "Activate storage securely with Bitcoin when you're ready." },
] as const;

export const useCases = [
  "International buyers and sellers who need a reliable line abroad",
  "Marketplace operators who want faster response times",
  "Consultants and freelancers separating work from personal calls",
  "Medical and legal offices handling sensitive conversations",
  "Anyone who'd rather not give strangers their mobile number",
] as const;

export const businessModel = {
  headline: "Straightforward pricing",
  detail:
    "Start with the app for free. Activate 1 GB of secure storage to save contacts and call history. Pay once via Bitcoin—no subscription surprises.",
  tiers: [
    "App download: free",
    "1 GB secure storage: one-time activation via BTCPay",
    "Enterprise teams: custom plans with dedicated support",
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
  "Opens to Phone—dial pad and place calls immediately after sign-in",
  "Register with email + phone (no demo logins)",
  "Circle mainnet USDC wallet created on signup",
  "Payment layer: transfers, escrow, procurement, swaps, appeals",
  "Fiverr-style orders, bonds, and admin dispute panel",
  "iMessage-style messaging and Cash App–style wallet UI",
  "$9.99/mo storage via BTCPayServer (contacts & call history)",
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
    bio: "Available for consultations through Payphone—professional, private, and on your schedule.",
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
    bio: "White-glove support for Payphone business customers.",
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
    bio: "We help your team get calling on day one.",
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
  { year: "1984", event: "Bell System divestiture; regional operating companies emerge." },
  { year: "2024", event: "Old West Solutions LLC launches payphone.cc." },
  { year: "Today", event: "International tele communications for a connected world." },
] as const;

export const footerColumns = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "Privacy", href: "/#privacy" },
      { label: "Plans", href: "/business" },
      { label: "Download", href: "/download" },
    ],
  },
  {
    title: "Get started",
    links: [
      { label: "Download for Windows", href: "/download#windows" },
      { label: "Download for macOS", href: "/download#macos" },
      { label: "Log in", href: "/account" },
      { label: "Business", href: "/business" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help Center", href: "/support" },
      { label: "Contact us", href: "/support#contact" },
      { label: "Privacy", href: "/support#privacy" },
      { label: "Terms", href: "/support#terms" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/heritage" },
      { label: "Old West Solutions", href: "/heritage" },
      { label: "Regulatory", href: "/support#regulatory" },
    ],
  },
] as const;

export const professionalComms = {
  eyebrow: "Simple pricing",
  title: "A phone line that works for you",
  lead: executiveSummary.paragraphs[0],
  body: executiveSummary.paragraphs[1],
  features: differentiators.map((d) => d.title),
  idealFor: useCases.slice(0, 4),
  cta: "See features",
  ctaHref: "/#features",
} as const;

export const architectureTiers = architectureServices.map((s, i) => ({
  tier: i + 1,
  name: s.name,
  body: s.body,
}));

export const whyAnonymity = problemMarkets.map((m) => m.title);

export const quickActions = [
  { label: "Download", href: "/download", icon: "download" },
  { label: "Features", href: "/#features", icon: "signal" },
  { label: "Privacy", href: "/#privacy", icon: "shield" },
  { label: "Business", href: "/business", icon: "building" },
  { label: "Support", href: "/support", icon: "alert" },
] as const;

export const services = differentiators.map((d) => ({
  title: d.title,
  body: d.body,
  href: "/#features",
}));
