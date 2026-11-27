import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FinanceHubWhatsAppButton } from "./FinanceHubWhatsAppButton";

describe("FinanceHubWhatsAppButton", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("opens the Oxford WhatsApp chat with a short corporate-style Finance Hub reference", () => {
    const randomValues = vi
      .fn()
      .mockImplementationOnce((bytes: Uint8Array) => bytes.fill(0))
      .mockImplementationOnce((bytes: Uint8Array) => bytes.fill(1));
    vi.stubGlobal("crypto", { getRandomValues: randomValues });
    const open = vi.spyOn(window, "open").mockImplementation(() => null);

    render(<FinanceHubWhatsAppButton />);
    const button = screen.getByRole("link", {
      name: "Start a Finance Hub enquiry on WhatsApp",
    });

    fireEvent.click(button);
    fireEvent.click(button);

    expect(randomValues).toHaveBeenCalledTimes(2);
    expect(open).toHaveBeenCalledTimes(2);
    const firstUrl = new URL(open.mock.calls[0][0] as string);
    const secondUrl = new URL(open.mock.calls[1][0] as string);
    const firstMessage = firstUrl.searchParams.get("text") ?? "";
    const secondMessage = secondUrl.searchParams.get("text") ?? "";
    const firstReference = firstMessage.match(
      /Reference: (OXFH-\d{6}-[A-Z2-9]{6})/,
    )?.[1];
    const secondReference = secondMessage.match(
      /Reference: (OXFH-\d{6}-[A-Z2-9]{6})/,
    )?.[1];

    expect(firstUrl.origin + firstUrl.pathname).toBe(
      "https://wa.me/27639089071",
    );
    expect(firstMessage).toContain("Finance Hub Enquiry");
    expect(firstReference).toMatch(/^OXFH-\d{6}-[A-Z2-9]{6}$/);
    expect(secondReference).toMatch(/^OXFH-\d{6}-[A-Z2-9]{6}$/);
    expect(firstReference).not.toBe(secondReference);
    expect(firstMessage).not.toContain(
      "I am contacting you from the Oxford Finance Hub",
    );
    expect(firstMessage).not.toContain("8f1a2b3c");
    expect(open.mock.calls[0][1]).toBe("_blank");
    expect(open.mock.calls[0][2]).toBe("noopener,noreferrer");
  });
});
