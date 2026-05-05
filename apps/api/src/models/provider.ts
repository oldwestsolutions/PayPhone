import mongoose, { Schema } from "mongoose";

/** Demo / bootstrap provider records — parent ecosystems supply authoritative linkage. */
export type ProviderDoc = {
  providerId: string;
  tenantId: string;
  did: string;
  displayName: string;
  bio: string;
  ratePerSecond: string;
  maxDurationSec: number;
  walletAddress: string;
  availabilityOnline: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const providerSchema = new Schema<ProviderDoc>(
  {
    providerId: { type: String, required: true, unique: true, index: true },
    tenantId: { type: String, required: true, index: true },
    did: { type: String, required: true, index: true },
    displayName: { type: String, required: true },
    bio: { type: String, default: "" },
    ratePerSecond: { type: String, required: true },
    maxDurationSec: { type: Number, required: true },
    walletAddress: { type: String, required: true },
    availabilityOnline: { type: Boolean, default: false },
  },
  { timestamps: true }
);

providerSchema.index({ tenantId: 1, did: 1 }, { unique: true });

export const Provider =
  mongoose.models.Provider ??
  mongoose.model<ProviderDoc>("Provider", providerSchema);
