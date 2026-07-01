import type { Metadata } from "next";
import { site } from "./content";

const baseUrl = `https://${site.domain}`;

export const defaultMetadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: `${site.name} — Privacy-Preserving Marketplace Communications`,
    template: `%s · ${site.name}`,
  },
  description:
    "Payphone.cc is a self-hosted communication layer for marketplaces: masked voice calls, masked SMS, session-scoped privacy, and CRM tracking. Whitepaper v2.0 by Old West Solutions LLC.",
  keywords: [
    "payphone.cc",
    "masked phone calls",
    "marketplace communications",
    "privacy-preserving SMS",
    "session-scoped routing",
    "Twilio proxy numbers",
    "self-hosted microservices",
    "Docker Compose",
    "Old West Solutions",
  ],
  authors: [{ name: site.legalName }],
  creator: site.legalName,
  publisher: site.legalName,
  robots: { index: true, follow: true },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: baseUrl,
    siteName: site.name,
    title: `${site.name} — ${site.tagline}`,
    description:
      "Masked voice and messaging for marketplaces. Real-time communication without exposing personal phone numbers.",
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — Masked Marketplace Communications`,
    description:
      "Self-hosted microservices for privacy-preserving buyer-seller communication. Whitepaper v2.0.",
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
