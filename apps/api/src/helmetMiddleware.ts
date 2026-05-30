import type { RequestHandler } from "express";
import helmetImport from "helmet";

export type HelmetOptions = {
  crossOriginResourcePolicy?: {
    policy: "cross-origin" | "same-origin" | "same-site" | "cross-site";
  };
};

/** Helmet v8 ESM default export — wrapper for NodeNext / TS 5.x */
export function helmetMiddleware(options?: HelmetOptions): RequestHandler {
  const helmetFn = (
    typeof helmetImport === "function"
      ? helmetImport
      : (helmetImport as { default: (opts?: HelmetOptions) => RequestHandler }).default
  ) as (opts?: HelmetOptions) => RequestHandler;

  return helmetFn(options);
}
