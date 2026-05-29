"use client";

import Link from "next/link";
import { hero, site } from "@/lib/content";
import { useHeroScrollProgress } from "@/hooks/useParallax";
import { cn } from "@/lib/utils";

// One ascending block in the 3D blockchain illustration
function Block({
  x,
  y,
  z,
  size,
  delay,
  accent,
  linked,
}: {
  x: number;
  y: number;
  z: number;
  size: number;
  delay: number;
  accent?: boolean;
  linked?: boolean;
}) {
  const s = size;
  const half = s / 2;
  const colors = accent
    ? {
        top: "rgba(184,115,51,0.55)",
        front: "rgba(143,90,40,0.70)",
        side: "rgba(110,65,28,0.80)",
        border: "rgba(212,165,116,0.55)",
      }
    : {
        top: "rgba(30,56,92,0.70)",
        front: "rgba(12,26,46,0.85)",
        side: "rgba(8,18,34,0.90)",
        border: "rgba(212,165,116,0.18)",
      };

  return (
    <g
      style={{
        animation: `blockFloat ${3.8 + delay * 0.7}s ease-in-out ${delay}s infinite alternate`,
      }}
    >
      {/* Shadow */}
      <ellipse
        cx={x}
        cy={y + half * 0.35}
        rx={half * 0.75}
        ry={half * 0.22}
        fill="rgba(0,0,0,0.18)"
      />
      {/* Side face */}
      <polygon
        points={`${x + half},${y - z} ${x + half},${y - z + s * 0.55} ${x},${y - z + s * 0.82} ${x},${y - z + s * 0.27}`}
        fill={colors.side}
        stroke={colors.border}
        strokeWidth="0.5"
      />
      {/* Front face */}
      <polygon
        points={`${x - half},${y - z} ${x - half},${y - z + s * 0.55} ${x},${y - z + s * 0.82} ${x},${y - z + s * 0.27}`}
        fill={colors.front}
        stroke={colors.border}
        strokeWidth="0.5"
      />
      {/* Top face */}
      <polygon
        points={`${x},${y - z - half * 0.55} ${x + half},${y - z} ${x},${y - z + s * 0.27} ${x - half},${y - z}`}
        fill={colors.top}
        stroke={colors.border}
        strokeWidth="0.5"
      />
      {/* Hash text on top */}
      <text
        x={x}
        y={y - z - half * 0.04}
        textAnchor="middle"
        fontSize={s * 0.12}
        fill={accent ? "rgba(255,240,200,0.7)" : "rgba(184,115,51,0.4)"}
        fontFamily="monospace"
      >
        {accent ? "0xA4F…" : "0x3C…"}
      </text>
      {/* Link line to next block */}
      {linked && (
        <line
          x1={x + half}
          y1={y - z + s * 0.27}
          x2={x + half + 30}
          y2={y - z - 18}
          stroke="rgba(184,115,51,0.3)"
          strokeWidth="1"
          strokeDasharray="4 3"
        />
      )}
    </g>
  );
}

function BlockchainBg({ scrollP }: { scrollP: number }) {
  const lift = scrollP * 60;

  const blocks = [
    { x: 160,  y: 520, z: 20  + lift * 0.6,  size: 72,  delay: 0,   accent: false, linked: true  },
    { x: 310,  y: 470, z: 55  + lift * 0.8,  size: 80,  delay: 0.4, accent: true,  linked: true  },
    { x: 460,  y: 510, z: 35  + lift * 0.9,  size: 70,  delay: 0.9, accent: false, linked: true  },
    { x: 600,  y: 460, z: 80  + lift * 1.1,  size: 86,  delay: 0.2, accent: true,  linked: true  },
    { x: 750,  y: 500, z: 50  + lift * 0.7,  size: 74,  delay: 0.7, accent: false, linked: true  },
    { x: 900,  y: 445, z: 110 + lift * 1.2,  size: 92,  delay: 0.3, accent: true,  linked: false },
    { x: 1060, y: 490, z: 65  + lift * 0.85, size: 78,  delay: 1.1, accent: false, linked: false },
    // back row
    { x: 240,  y: 620, z: 10  + lift * 0.4,  size: 60,  delay: 1.5, accent: false, linked: false },
    { x: 520,  y: 600, z: 25  + lift * 0.5,  size: 64,  delay: 1.8, accent: false, linked: false },
    { x: 820,  y: 590, z: 40  + lift * 0.6,  size: 62,  delay: 1.2, accent: true,  linked: false },
    // front accent
    { x: 380,  y: 700, z: 5   + lift * 0.3,  size: 54,  delay: 2.0, accent: false, linked: false },
    { x: 680,  y: 680, z: 15  + lift * 0.35, size: 58,  delay: 1.6, accent: true,  linked: false },
  ];

  return (
    <svg
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMidYMax slice"
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden
    >
      <defs>
        <radialGradient id="bgGlow" cx="50%" cy="60%" r="55%">
          <stop offset="0%" stopColor="rgba(184,115,51,0.12)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
        <radialGradient id="topGlow" cx="50%" cy="0%" r="60%">
          <stop offset="0%" stopColor="rgba(185,28,60,0.10)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#bgGlow)" />
      <rect width="1200" height="800" fill="url(#topGlow)" />
      {blocks.map((b, i) => (
        <Block key={i} {...b} />
      ))}
    </svg>
  );
}

export function Hero3D() {
  const scrollP = useHeroScrollProgress();
  const bgY = scrollP * 100;
  const opacity = 1 - scrollP * 0.4;

  return (
    <section
      className="scene-root relative min-h-[100dvh] min-h-screen flex flex-col justify-center items-center overflow-hidden bg-navy-deep text-white"
      aria-label="Introduction"
    >
      {/* Parallax background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ transform: `translate3d(0, ${bgY}px, 0)` }}
      >
        <div className="absolute inset-0 bg-hero-gradient" />
        <BlockchainBg scrollP={scrollP} />
        {/* subtle vignette so text stays legible */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 50%, transparent 30%, rgba(6,14,26,0.65) 100%)",
          }}
        />
      </div>

      {/* Centered content */}
      <div
        className="relative z-10 flex flex-col items-center text-center px-4 pt-28 pb-20 md:pt-36 md:pb-28 max-w-4xl mx-auto w-full"
        style={{ opacity }}
      >
        <p className={cn("section-label text-copper-light mb-4")}>{hero.eyebrow}</p>

        <h1 className="heading-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white leading-[1.05] max-w-3xl">
          {hero.title}
        </h1>

        <div className="rule-gold mx-auto my-7" />

        <p className="text-base md:text-lg text-white/75 max-w-2xl leading-relaxed font-light">
          {hero.subtitle}
        </p>

        <div className="flex flex-wrap justify-center gap-3 md:gap-4 mt-8">
          <Link href="/#architecture" className="btn-primary">
            {hero.ctaPrimary}
          </Link>
          <Link href="/#use-cases" className="btn-ghost-light">
            {hero.ctaSecondary}
          </Link>
        </div>

        <p className="mt-14 md:mt-20 text-[10px] uppercase tracking-widest text-white/30">
          {site.name} · Scroll to explore ↓
        </p>
      </div>

      {/* Bottom accent bar */}
      <div className="absolute bottom-0 left-0 right-0 z-10 h-1.5 bg-gradient-to-r from-crimson via-crimson-bright to-copper" />
    </section>
  );
}
