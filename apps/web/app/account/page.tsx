import { PageHero } from "@/components/PageHero";
import Link from "next/link";

export const metadata = { title: "My account" };

export default function AccountPage() {
  return (
    <>
      <PageHero
        eyebrow="Sign in"
        title="My account"
        subtitle="Manage your lines, bills, and appointments. Authentication will arrive when backend services are provisioned."
      />

      <section className="py-16">
        <div className="mx-auto max-w-md px-4">
          <form className="card-luxury p-8 space-y-5" action="#">
            <label className="block text-sm">
              <span className="text-slate-uk">Account number</span>
              <input
                type="text"
                placeholder="PP-00000000"
                className="mt-1 w-full rounded-xl border border-navy/15 px-4 py-3 text-sm outline-none focus:border-copper"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-uk">ZIP code</span>
              <input
                type="text"
                className="mt-1 w-full rounded-xl border border-navy/15 px-4 py-3 text-sm outline-none focus:border-copper"
              />
            </label>
            <button type="submit" className="btn-primary w-full">
              Continue
            </button>
            <p className="text-xs text-center text-slate-soft">
              New customer?{" "}
              <Link href="/personal" className="text-crimson hover:underline">
                View plans
              </Link>
            </p>
          </form>
        </div>
      </section>
    </>
  );
}
