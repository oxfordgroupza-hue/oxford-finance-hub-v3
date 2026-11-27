import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FinanceHubWhatsAppButton } from "./FinanceHubWhatsAppButton";

describe("FinanceHubWhatsAppButton", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("opens the Oxford WhatsApp chat with a Finance Hub label and a fresh contact-form-style UUID reference", () => {
    const references = [
      "8f1a2b3c-4d5e-4f60-8123-abcdef012345",
      "9a2b3c4d-5e6f-4071-9234-bcdef0123456",
    ];
    const randomUUID = vi
      .fn()
      .mockReturnValueOnce(references[0])
      .mockReturnValueOnce(references[1]);
    vi.stubGlobal("crypto", { randomUUID });
    const open = vi.spyOn(window, "open").mockImplementation(() => null);

    render(<FinanceHubWhatsAppButton />);
    const button = screen.getByRole("link", {
      name: "Start a Finance Hub enquiry on WhatsApp",
    });

    fireEvent.click(button);
    fireEvent.click(button);

    expect(randomUUID).toHaveBeenCalledTimes(2);
    expect(open).toHaveBeenCalledTimes(2);
    const firstUrl = new URL(open.mock.calls[0][0] as string);
    const secondUrl = new URL(open.mock.calls[1][0] as string);

    expect(firstUrl.origin + firstUrl.pathname).toBe(
      "https://wa.me/27639089071",
    );
    expect(firstUrl.searchParams.get("text")).toContain("Oxford Finance Hub");
    expect(firstUrl.searchParams.get("text")).toContain("Finance Hub Enquiry");
    expect(firstUrl.searchParams.get("text")).toContain(
      `Reference: ${references[0]}`,
    );
    expect(secondUrl.searchParams.get("text")).toContain(
      `Reference: ${references[1]}`,
    );
    expect(firstUrl.searchParams.get("text")).not.toBe(
      secondUrl.searchParams.get("text"),
    );
    expect(open.mock.calls[0][1]).toBe("_blank");
    expect(open.mock.calls[0][2]).toBe("noopener,noreferrer");
  });
});
