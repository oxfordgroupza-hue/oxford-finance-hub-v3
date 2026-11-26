import { describe, expect, it } from "vitest";
import { isSameOriginRequest } from "./origin-validation";

describe("same-origin request validation", () => {
  const requestUrl =
    "https://work-v3-cloudflare-native-auth-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/api/oxford";

  it("accepts the same preview origin", () => {
    expect(
      isSameOriginRequest(
        "https://work-v3-cloudflare-native-auth-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev",
        requestUrl,
      ),
    ).toBe(true);
  });

  it("rejects a different preview origin", () => {
    expect(
      isSameOriginRequest("https://another-project.workers.dev", requestUrl),
    ).toBe(false);
  });

  it("rejects a different scheme or port", () => {
    expect(
      isSameOriginRequest(
        "http://work-v3-cloudflare-native-auth-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev",
        requestUrl,
      ),
    ).toBe(false);
    expect(
      isSameOriginRequest(
        "https://work-v3-cloudflare-native-auth-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev:444",
        requestUrl,
      ),
    ).toBe(false);
  });

  it("rejects malformed origins", () => {
    expect(isSameOriginRequest("not-an-origin", requestUrl)).toBe(false);
  });

  it("allows requests without an Origin header for non-browser read-only callers", () => {
    expect(isSameOriginRequest(null, requestUrl)).toBe(true);
  });

  it("rejects state-changing requests without an Origin header", () => {
    expect(isSameOriginRequest(null, requestUrl, true)).toBe(false);
  });

  it("rejects requests explicitly marked as cross-site even with a matching Origin", () => {
    expect(
      isSameOriginRequest(
        "https://work-v3-cloudflare-native-auth-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev",
        requestUrl,
        true,
        "cross-site",
      ),
    ).toBe(false);
    expect(
      isSameOriginRequest(
        "https://work-v3-cloudflare-native-auth-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev",
        requestUrl,
        true,
        "same-origin",
      ),
    ).toBe(true);
  });
});
