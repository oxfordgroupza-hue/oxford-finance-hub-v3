import { describe, expect, it } from "vitest";
import {
  ALLOWED_DOCUMENT_STORAGE_TYPES,
  EXPECTED_DOCUMENT_BUCKET,
  isApprovedCloudflarePreviewRequest,
  isStorageBucketVerified,
  MAX_BUCKET_FILE_BYTES,
} from "./document-storage-security";

const validBucket = {
  id: EXPECTED_DOCUMENT_BUCKET,
  public: false,
  file_size_limit: MAX_BUCKET_FILE_BYTES,
  allowed_mime_types: [...ALLOWED_DOCUMENT_STORAGE_TYPES],
};

const cloudflarePreviewUrl =
  "https://work-v3-cloudflare-native-auth-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/api/oxford";

describe("private document bucket verification", () => {
  it("accepts only the exact private bucket configuration", () => {
    expect(isStorageBucketVerified(validBucket)).toBe(true);
  });

  it("rejects a public bucket or a different bucket name", () => {
    expect(isStorageBucketVerified({ ...validBucket, public: true })).toBe(
      false,
    );
    expect(
      isStorageBucketVerified({ ...validBucket, id: "another-bucket" }),
    ).toBe(false);
  });

  it("rejects a file limit that differs from the approved 10 MB", () => {
    expect(
      isStorageBucketVerified({
        ...validBucket,
        file_size_limit: 4 * 1024 * 1024,
      }),
    ).toBe(false);
    expect(
      isStorageBucketVerified({ ...validBucket, file_size_limit: null }),
    ).toBe(false);
  });

  it("rejects missing, extra or unsupported MIME types", () => {
    expect(
      isStorageBucketVerified({
        ...validBucket,
        allowed_mime_types: ["application/pdf"],
      }),
    ).toBe(false);
    expect(
      isStorageBucketVerified({
        ...validBucket,
        allowed_mime_types: [...ALLOWED_DOCUMENT_STORAGE_TYPES, "text/plain"],
      }),
    ).toBe(false);
    expect(
      isStorageBucketVerified({
        ...validBucket,
        allowed_mime_types: ["application/pdf", "image/jpeg", "image/gif"],
      }),
    ).toBe(false);
  });
});

describe("Cloudflare Worker preview storage gate", () => {
  it("accepts only the exact HTTPS Cloudflare preview hostname", () => {
    expect(isApprovedCloudflarePreviewRequest(cloudflarePreviewUrl)).toBe(true);
  });

  it("rejects production and other preview hostnames", () => {
    expect(
      isApprovedCloudflarePreviewRequest(
        "https://finance.oxfordbusinessgroup.co.za/api/oxford",
      ),
    ).toBe(false);
    expect(
      isApprovedCloudflarePreviewRequest(
        "https://oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/api/oxford",
      ),
    ).toBe(false);
  });

  it("rejects HTTP, credentials and nonstandard ports", () => {
    expect(
      isApprovedCloudflarePreviewRequest(
        cloudflarePreviewUrl.replace("https://", "http://"),
      ),
    ).toBe(false);
    expect(
      isApprovedCloudflarePreviewRequest(
        cloudflarePreviewUrl.replace("://", "://user:pass@"),
      ),
    ).toBe(false);
    expect(
      isApprovedCloudflarePreviewRequest(
        cloudflarePreviewUrl.replace(".workers.dev/", ".workers.dev:8443/"),
      ),
    ).toBe(false);
  });

  it("rejects malformed URLs", () => {
    expect(isApprovedCloudflarePreviewRequest("not a URL")).toBe(false);
  });
});
