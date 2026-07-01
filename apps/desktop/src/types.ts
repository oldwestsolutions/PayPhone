export type UserAccount = {
  username: string;
  email: string;
  stellar_public_key: string;
  circle_wallet_address: string;
  masked_number: string;
  storage_paid: boolean;
};

export type Contact = { name: string; number: string; company?: string };
export type CallRecord = {
  id: string;
  number: string;
  direction: string;
  status: string;
  started_at: number;
};
export type Invoice = {
  id: string;
  checkout_link: string;
  amount: string;
  currency: string;
  status: string;
  description: string;
};
export type BillingStatus = { btcpay_configured: boolean; btcpay_url: string };
export type PlaceCallResult = {
  record: CallRecord;
  telephony_available: boolean;
  message: string;
  masked_caller_id: string;
  session_id: string;
  connected: boolean;
};
export type UsernameRules = {
  min_length: number;
  max_length: number;
  requires_digit: boolean;
  example: string;
};
export type WalletSummary = {
  provider: string;
  public_key: string;
  balance_xlm: string;
  balance_usd: string;
  circle_wallet_id: string;
  circle_address: string;
  circle_usdc: string;
  circle_balances: { token_id?: string; symbol: string; amount: string; blockchain?: string; token_address?: string }[];
  circle_live: boolean;
  funded: boolean;
};
export type EscrowContract = {
  contractId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  currency: string;
  status: string;
  circleFundTxId?: string;
};
export type DashboardStats = {
  calls_count: number;
  contacts_count: number;
  escrows_active: number;
  escrow_engine_online: boolean;
};

export type AppSection = "dashboard" | "wallet" | "escrow" | "phone" | "settings";

export function validateStellarUsername(
  username: string,
  rules: UsernameRules
): string | null {
  const len = [...username].length;
  if (len < rules.min_length) {
    return `Stellar username must be at least ${rules.min_length} characters (yours is ${len}).`;
  }
  if (len > rules.max_length) {
    return `Stellar username must be at most ${rules.max_length} characters (yours is ${len}).`;
  }
  if (!/^[a-zA-Z0-9_.]+$/.test(username)) {
    return "Stellar username may only use letters, numbers, underscores, and dots.";
  }
  if (rules.requires_digit && !/\d/.test(username)) {
    return `Stellar username must include at least one number (e.g. ${rules.example}).`;
  }
  return null;
}
