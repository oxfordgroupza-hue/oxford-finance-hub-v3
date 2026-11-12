import { describe, expect, it } from "vitest";
import { canTransitionApplicationStatus } from "./domain";

describe("application status transitions", () => {
  it("allows the expected operational progression", () => {
    expect(canTransitionApplicationStatus("Submitted", "Under review")).toBe(
      true,
    );
    expect(
      canTransitionApplicationStatus("Under review", "Awaiting documents"),
    ).toBe(true);
    expect(
      canTransitionApplicationStatus("Awaiting documents", "Under review"),
    ).toBe(true);
    expect(
      canTransitionApplicationStatus("Under review", "With finance provider"),
    ).toBe(true);
    expect(
      canTransitionApplicationStatus(
        "With finance provider",
        "Provider decision received",
      ),
    ).toBe(true);
    expect(
      canTransitionApplicationStatus("Provider decision received", "Closed"),
    ).toBe(true);
  });

  it("allows closure of an application that ends before a provider decision", () => {
    expect(canTransitionApplicationStatus("Submitted", "Closed")).toBe(true);
    expect(canTransitionApplicationStatus("Under review", "Closed")).toBe(true);
    expect(canTransitionApplicationStatus("Awaiting documents", "Closed")).toBe(
      true,
    );
    expect(
      canTransitionApplicationStatus("With finance provider", "Closed"),
    ).toBe(true);
  });

  it("never lets Office status controls change a customer draft", () => {
    for (const status of [
      "Submitted",
      "Under review",
      "Awaiting documents",
      "With finance provider",
      "Provider decision received",
      "Closed",
    ] as const) {
      expect(canTransitionApplicationStatus("Draft", status)).toBe(false);
    }
  });

  it("prevents skipping the provider submission and decision stages", () => {
    expect(
      canTransitionApplicationStatus("Submitted", "Provider decision received"),
    ).toBe(false);
    expect(
      canTransitionApplicationStatus(
        "Under review",
        "Provider decision received",
      ),
    ).toBe(false);
    expect(
      canTransitionApplicationStatus(
        "Awaiting documents",
        "Provider decision received",
      ),
    ).toBe(false);
    expect(
      canTransitionApplicationStatus("Submitted", "With finance provider"),
    ).toBe(false);
  });

  it("keeps closed applications terminal and rejects no-op changes", () => {
    expect(canTransitionApplicationStatus("Closed", "Submitted")).toBe(false);
    expect(canTransitionApplicationStatus("Closed", "Under review")).toBe(
      false,
    );
    expect(canTransitionApplicationStatus("Closed", "Closed")).toBe(false);
    expect(
      canTransitionApplicationStatus(
        "Provider decision received",
        "Under review",
      ),
    ).toBe(false);
  });
});
