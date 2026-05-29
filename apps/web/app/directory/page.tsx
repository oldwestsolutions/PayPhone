import { PageHero } from "@/components/PageHero";
import { directory } from "@/lib/content";
import { DirectoryCard } from "@/components/DirectoryCard";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verified directory",
  description:
    "Example professional listings for payphone.cc—attorneys, liaisons, and engineers with inherited ecosystem reputation.",
};

export default function DirectoryPage() {
  return (
    <>
      <PageHero
        eyebrow="Verified listings"
        title="Professional directory"
        subtitle="Consultants and specialists vetted for regulated industries. Booking and live sessions will connect when our platform launches."
      />

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {directory.map((entry) => (
            <DirectoryCard key={entry.id} entry={entry} />
          ))}
        </div>
      </section>
    </>
  );
}
