"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteFooterMinimal } from "@/components/SiteFooterMinimal";

export function SiteFooterSwitch() {
  const pathname = usePathname();
  if (pathname === "/") {
    return <SiteFooter />;
  }
  return <SiteFooterMinimal />;
}
