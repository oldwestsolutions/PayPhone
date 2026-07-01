import type { Metadata } from "next";
import { WhatsAppHero } from "@/components/WhatsAppHero";
import { FeatureSections } from "@/components/FeatureSections";

export const metadata: Metadata = {
  title: "payphone.cc — Privacy-Preserving Marketplace Communications",
  description:
    "Masked voice calls and SMS for marketplaces. Self-hosted microservices, session-scoped privacy, CRM tracking. Whitepaper v2.0 by Old West Solutions LLC.",
};

export default function HomePage() {
  return (
    <>
      <WhatsAppHero />
      <FeatureSections />
    </>
  );
}
