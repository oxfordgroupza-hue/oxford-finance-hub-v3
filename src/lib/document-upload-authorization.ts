import type { PermissionKey } from "./access-control";

export type DocumentUploadAccountType = "customer" | "partner" | "office";

/**
 * Office and customer uploads require their own-document permission.
 * Partner uploads use a separate, narrower referral-ownership and document-type
 * policy in the API handler, so they must not be gated by Office permissions.
 */
export function requiredDocumentUploadPermission(
  accountType: string,
): PermissionKey | null {
  if (accountType === "partner") return null;
  if (accountType === "customer") return "own_documents.create";
  return "documents.create";
}
