import { cn } from "@/lib/utils";

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  dark?: boolean;
};

export function PageHero({ eyebrow, title, subtitle }: Props) {
  return (
    <section className="border-b border-luxury-border bg-hero-luxury relative">
      <div className="absolute inset-0 bg-white/5 pointer-events-none" />
      <div className="relative mx-auto max-w-7xl px-4 py-14 lg:py-20 space-y-4">
        {eyebrow && <p className="section-eyebrow">{eyebrow}</p>}
        <h1 className="text-4xl lg:text-5xl font-display font-light tracking-tight max-w-3xl text-white">
          {title}
        </h1>
        {subtitle && (
          <p className="max-w-2xl text-base leading-relaxed text-luxury-gray">{subtitle}</p>
        )}
        <div className="luxury-divider max-w-xs" />
      </div>
    </section>
  );
}
