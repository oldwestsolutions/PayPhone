import mongoose, { Schema } from "mongoose";

export type SessionStatus =
  | "created"
  | "accepted"
  | "active"
  | "ended"
  | "settled"
  | "disputed";

export type CallSessionDoc = {
  sessionId: string;
  tenantId: string;
  clientDid: string;
  providerDid: string;
  status: SessionStatus;
  ratePerSecond: string;
  maxDurationSec: number;
  escrowTxHash?: string;
  chainId?: number;
  callStartedAt?: Date;
  callEndedAt?: Date;
  serverDurationSec?: number;
  clientReportedDurationSec?: number;
  createdAt: Date;
  updatedAt: Date;
};

const sessionSchema = new Schema<CallSessionDoc>(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    tenantId: { type: String, required: true, index: true },
    clientDid: { type: String, required: true },
    providerDid: { type: String, required: true },
    status: {
      type: String,
      enum: [
        "created",
        "accepted",
        "active",
        "ended",
        "settled",
        "disputed",
      ],
      default: "created",
    },
    ratePerSecond: { type: String, required: true },
    maxDurationSec: { type: Number, required: true },
    escrowTxHash: { type: String },
    chainId: { type: Number },
    callStartedAt: { type: Date },
    callEndedAt: { type: Date },
    serverDurationSec: { type: Number },
    clientReportedDurationSec: { type: Number },
  },
  { timestamps: true }
);

export const CallSession =
  mongoose.models.CallSession ??
  mongoose.model<CallSessionDoc>("CallSession", sessionSchema);
