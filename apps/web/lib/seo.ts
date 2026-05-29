import type { Metadata } from "next";
import { site } from "./content";

const baseUrl = `https://${site.domain}`;

export const defaultMetadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: `${site.name} — WebRTC & On-Chain Settlement for Verified Marketplaces`,
    template: `%s · ${site.name}`,
  },
  description:
    "payphone.cc is a multi-tenant microservice by Old West Solutions LLC: anonymous WebRTC signaling, DID authentication, reputation inheritance, and blockchain escrow for professional marketplaces.",
  keywords: [
    "payphone.cc",
    "WebRTC marketplace",
    "DID authentication",
    "on-chain settlement",
    "verified identity communications",
    "anonymous professional calls",
    "multi-tenant microservice",
    "reputation inheritance",
    "blockchain escrow",
    "Old West Solutions",
  ],
  authors: [{ name: site.legalName }],
  creator: site.legalName,
  publisher: site.legalName,
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: baseUrl,
    siteName: site.name,
    title: `${site.name} — Verified-Identity Comms Microservice`,
    description:
      "Plug-and-play WebRTC infrastructure with peer-to-peer media, DID auth, and transparent 5% on-chain settlement.",
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — WebRTC + Blockchain Settlement`,
    description:
      "Anonymous P2P calls for legal, consulting, healthcare, and real estate marketplaces. No central call logs.",
  },
  alternates: { canonical: baseUrl },
};

export const jsonLdOrganization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: site.legalName,
  url: baseUrl,
  brand: { "@type": "Brand", name: site.name },
  description: defaultMetadata.description,
};
