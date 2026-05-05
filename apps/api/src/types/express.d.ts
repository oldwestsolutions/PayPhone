import type { TenantConfig } from "../config.js";

declare global {
  namespace Express {
    interface Request {
      tenant?: TenantConfig;
      didPublicKeyB64?: string;
      /** Populated by json parser `verify` for signature checks */
      rawBody?: string;
    }
  }
}

export {};
