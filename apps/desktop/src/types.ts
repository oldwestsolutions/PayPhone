export type UserAccount = {
  username: string;
  email: string;
  stellar_public_key: string;
  circle_wallet_address: string;
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
};
export type WalletSummary = {
  provider: string;
  public_key: string;
  balance_xlm: string;
  balance_usd: string;
  circle_address: string;
  funded: boolean;
};
export type EscrowContract = {
  contractId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  currency: string;
  status: string;
};
export type DashboardStats = {
  calls_count: number;
  contacts_count: number;
  escrows_active: number;
  escrow_engine_online: boolean;
};

export type AppSection = "dashboard" | "wallet" | "escrow" | "phone" | "settings";
