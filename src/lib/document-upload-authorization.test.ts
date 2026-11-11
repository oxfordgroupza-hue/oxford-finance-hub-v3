import { describe, expect, it } from "vitest";
import { requiredDocumentUploadPermission } from "./document-upload-authorization";

describe("document upload permission routing", () => {
  it("uses customer-owned document permission for applicants", () => {
    expect(requiredDocumentUploadPermission("customer")).toBe(
      "own_documents.create",
    );
  });

  it("uses Office document permission for staff", () => {
    expect(requiredDocumentUploadPermission("office")).toBe("documents.create");
  });

  it("routes partners through the narrower referral and document-type policy", () => {
    expect(requiredDocumentUploadPermission("partner")).toBeNull();
  });
});
