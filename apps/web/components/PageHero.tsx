import { cn } from "@/lib/utils";

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  dark?: boolean;
};

export function PageHero({ eyebrow, title, subtitle, dark = false }: Props) {
  return (
    <section
      className={cn(
        "border-b",
        dark
          ? "bg-hero-gradient text-white border-white/10"
          : "bg-white border-navy/10"
      )}
    >
      <div className="mx-auto max-w-7xl px-4 py-14 lg:py-20 space-y-4">
        {eyebrow && (
          <p className={cn("section-label", dark && "text-copper-light")}>{eyebrow}</p>
        )}
        <h1
          className={cn(
            "heading-display text-4xl lg:text-5xl max-w-3xl",
            dark ? "text-white" : "text-navy"
          )}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className={cn(
              "max-w-2xl text-sm leading-relaxed",
              dark ? "text-white/70" : "text-slate-uk"
            )}
          >
            {subtitle}
          </p>
        )}
        <div className={cn("rule-gold", dark && "opacity-90")} />
      </div>
      {dark && (
        <div className="h-1 bg-gradient-to-r from-crimson to-copper" aria-hidden />
      )}
    </section>
  );
}
