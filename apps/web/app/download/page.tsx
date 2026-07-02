import type { Metadata } from "next";
import Link from "next/link";
import { PhoneIcon } from "@/components/PhoneIcon";
import { desktopFeatures, downloadPlatforms, site } from "@/lib/content";

export const metadata: Metadata = {
  title: "Download Payphone Desktop App",
  description:
    "Download Payphone for Windows and macOS. Enterprise communications with masked sessions, Haskell escrow, and BTCPayServer integration.",
};

const windows = downloadPlatforms.find((p) => p.id === "windows")!;
const macos = downloadPlatforms.find((p) => p.id === "macos")!;

function WindowsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8 text-white" fill="currentColor" aria-hidden>
      <path d="M3 5.5L10.5 4.5V11.5H3V5.5zm0 7.5h7.5v7L3 19V13zm9-8.5L21 3.5V11.5H12V4.5zm0 9H21v7.5l-9-1.5V13.5z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8 text-luxury-gray" fill="currentColor" aria-hidden>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function FeatureList() {
  return (
    <ul className="space-y-2">
      {desktopFeatures.map((f) => (
        <li key={f} className="flex gap-2 text-sm text-luxury-gray">
          <span className="text-white">✓</span>
          {f}
        </li>
      ))}
    </ul>
  );
}

export default function DownloadPage() {
  return (
    <div className="bg-luxury-black">
      <section className="relative py-16 md:py-24 bg-hero-luxury border-b border-luxury-border">
        <div className="mx-auto max-w-4xl px-4 text-center space-y-6">
          <PhoneIcon size={48} className="mx-auto" />
          <p className="section-eyebrow">Enterprise v{site.enterpriseVersion}</p>
          <h1 className="heading-section">Download Payphone</h1>
          <p className="text-lg text-luxury-gray max-w-2xl mx-auto">
            Desktop app with RingCentral-style calling, Circle mainnet USDC, payment-layer escrow &amp; procurement,
            job bonds, and Fiverr-style dispute resolution.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-4">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Windows */}
            <div
              id="windows"
              className="feature-card space-y-6 scroll-mt-24 border-white/20 shadow-luxury-glow"
            >
              <div className="flex items-center gap-4">
                <WindowsIcon />
                <div>
                  <h2 className="text-2xl font-display font-light text-white">{windows.name}</h2>
                  <p className="text-sm text-luxury-gray-dim">Version {windows.version}</p>
                </div>
              </div>
              <p className="text-sm text-luxury-gray">{windows.requirements}</p>
              <FeatureList />
              <a href={windows.href} download className="btn-download w-full justify-center">
                Download MSI installer
              </a>
              <a
                href={windows.altHref}
                download
                className="block text-center text-sm text-white hover:underline"
              >
                {windows.altLabel}
              </a>
              <p className="text-xs text-luxury-gray-dim text-center">{windows.filename}</p>
            </div>

            {/* macOS */}
            <div id="macos" className="feature-card space-y-6 scroll-mt-24 opacity-90">
              <div className="flex items-center gap-4">
                <AppleIcon />
                <div>
                  <h2 className="text-2xl font-display font-light text-white">{macos.name}</h2>
                  <p className="text-sm text-luxury-gray-dim">Version {macos.version}</p>
                </div>
              </div>
              <p className="text-sm text-luxury-gray">{macos.requirements}</p>
              <FeatureList />
              <p className="text-sm text-luxury-gray text-center py-3 bg-luxury-elevated rounded-2xl border border-luxury-border">
                Build on macOS:{" "}
                <code className="text-xs text-white">npm run desktop:build</code>
              </p>
              <p className="text-xs text-luxury-gray-dim text-center">{macos.filename}</p>
            </div>
          </div>

          <div className="mt-16 feature-card space-y-4 border-white/10">
            <h3 className="text-lg font-medium text-white">Self-hosted backend</h3>
            <p className="text-sm text-luxury-gray leading-relaxed">
              The desktop app connects to your operator&apos;s Payphone backend — API Gateway,
              Haskell Contract Engine, and BTCPayServer Payment Adapter. Deploy with Docker
              Compose, then set your API URL in Settings.
            </p>
            <Link href="/business#deploy" className="text-white text-sm font-medium hover:underline">
              View deployment guide →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
