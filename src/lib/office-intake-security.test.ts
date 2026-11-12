import { describe, expect, it } from "vitest";
import {
  createOfficeInvitationToken,
  getOfficeInvitationClaimBlockReason,
  hashOfficeInvitationToken,
} from "./office-intake-security";

const validInvitation = (
  overrides: Partial<{
    status: string;
    claimedAt: Date | null;
    revokedAt: Date | null;
    tokenExpiresAt: Date;
  }> = {},
) => ({
  status: "invitation_sent",
  claimedAt: null,
  revokedAt: null,
  tokenExpiresAt: new Date("2026-11-20T12:00:00.000Z"),
  ...overrides,
});

describe("office applicant invitation security", () => {
  it("generates a high-entropy URL-safe token and stores only its SHA-256 digest", () => {
    const first = createOfficeInvitationToken();
    const second = createOfficeInvitationToken();

    expect(first.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.hash).toBe(hashOfficeInvitationToken(first.token));
    expect(first.hash).not.toBe(first.token);
    expect(second.token).not.toBe(first.token);
    expect(second.hash).not.toBe(first.hash);
  });

  it("allows only pending or sent invitations that are not claimed, revoked or expired", () => {
    const now = new Date("2026-11-12T12:00:00.000Z");

    expect(
      getOfficeInvitationClaimBlockReason(validInvitation(), now),
    ).toBeNull();
    expect(
      getOfficeInvitationClaimBlockReason(
        validInvitation({ status: "pending_invitation" }),
        now,
      ),
    ).toBeNull();
    expect(
      getOfficeInvitationClaimBlockReason(
        validInvitation({ status: "claimed", claimedAt: now }),
        now,
      ),
    ).toBe("claimed");
    expect(
      getOfficeInvitationClaimBlockReason(
        validInvitation({ claimedAt: now }),
        now,
      ),
    ).toBe("claimed");
    expect(
      getOfficeInvitationClaimBlockReason(
        validInvitation({ status: "revoked", revokedAt: now }),
        now,
      ),
    ).toBe("revoked");
    expect(
      getOfficeInvitationClaimBlockReason(
        validInvitation({ revokedAt: now }),
        now,
      ),
    ).toBe("revoked");
    expect(
      getOfficeInvitationClaimBlockReason(
        validInvitation({ status: "expired" }),
        now,
      ),
    ).toBe("expired");
    expect(
      getOfficeInvitationClaimBlockReason(
        validInvitation({ tokenExpiresAt: now }),
        now,
      ),
    ).toBe("expired");
    expect(
      getOfficeInvitationClaimBlockReason(
        validInvitation({ status: "unknown" }),
        now,
      ),
    ).toBe("invalid_state");
  });
});
