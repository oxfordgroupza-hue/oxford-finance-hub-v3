export const EXPECTED_DOCUMENT_BUCKET = "oxford-customer-documents";
export const MAX_BUCKET_FILE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_DOCUMENT_STORAGE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export type StorageBucketDetails = {
  id?: unknown;
  public?: unknown;
  file_size_limit?: unknown;
  allowed_mime_types?: unknown;
};

export function isStorageBucketVerified(
  details: StorageBucketDetails,
): boolean {
  const allowedTypes = Array.isArray(details.allowed_mime_types)
    ? details.allowed_mime_types
    : [];
  return (
    details.id === EXPECTED_DOCUMENT_BUCKET &&
    details.public === false &&
    Number(details.file_size_limit) === MAX_BUCKET_FILE_BYTES &&
    ALLOWED_DOCUMENT_STORAGE_TYPES.length === allowedTypes.length &&
    ALLOWED_DOCUMENT_STORAGE_TYPES.every((type) => allowedTypes.includes(type))
  );
}

function isApprovedHttpsHost(requestUrl: string, hostname: string): boolean {
  try {
    const parsed = new URL(requestUrl);
    return (
      parsed.protocol === "https:" &&
      !parsed.port &&
      !parsed.username &&
      !parsed.password &&
      parsed.hostname.toLowerCase() === hostname
    );
  } catch {
    return false;
  }
}

export function isApprovedCloudflarePreviewRequest(
  requestUrl: string,
): boolean {
  return isApprovedHttpsHost(
    requestUrl,
    "work-v3-cloudflare-native-auth-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev",
  );
}

export function isApprovedCloudflareProductionRequest(
  requestUrl: string,
): boolean {
  return isApprovedHttpsHost(requestUrl, "finance.oxfordbusinessgroup.co.za");
}

/** Only the explicitly configured Cloudflare Preview and Production origins may process live intake. */
export function isApprovedCloudflareApplicationRequest(
  requestUrl: string,
  context: string | undefined,
): boolean {
  if (context === "cloudflare-preview") {
    return isApprovedCloudflarePreviewRequest(requestUrl);
  }
  if (context === "cloudflare-production") {
    return isApprovedCloudflareProductionRequest(requestUrl);
  }
  return false;
}
