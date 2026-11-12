import { createHash, randomBytes } from "node:crypto";

export type OfficeInvitationClaimState = {
  status: string;
  claimedAt: Date | null;
  revokedAt: Date | null;
  tokenExpiresAt: Date;
};

export type OfficeInvitationClaimBlockReason =
  "claimed" | "revoked" | "expired" | "invalid_state";

export function createOfficeInvitationToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashOfficeInvitationToken(token) };
}

export function hashOfficeInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getOfficeInvitationClaimBlockReason(
  invitation: OfficeInvitationClaimState,
  now = new Date(),
): OfficeInvitationClaimBlockReason | null {
  if (invitation.status === "claimed" || invitation.claimedAt) return "claimed";
  if (invitation.status === "revoked" || invitation.revokedAt) return "revoked";
  if (
    invitation.status === "expired" ||
    invitation.tokenExpiresAt.getTime() <= now.getTime()
  )
    return "expired";
  if (
    invitation.status !== "pending_invitation" &&
    invitation.status !== "invitation_sent"
  )
    return "invalid_state";
  return null;
}
