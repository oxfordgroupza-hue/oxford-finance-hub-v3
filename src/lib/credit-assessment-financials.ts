export type FinancialEvidenceStatus =
  "verified" | "applicant_declared" | "independently_unverifiable";

export type IndividualFinancialAssessmentForm = {
  applicantType: "individual";
  netMonthlyIncome: string;
  netMonthlyIncomeStatus: FinancialEvidenceStatus;
  livingExpenses: string;
  livingExpensesStatus: FinancialEvidenceStatus;
  existingCommitments: string;
  existingCommitmentsStatus: FinancialEvidenceStatus;
  proposedInstalment: string;
  proposedInstalmentStatus: FinancialEvidenceStatus;
};

export type BusinessFinancialAssessmentForm = {
  applicantType: "business";
  monthlyBusinessIncome: string;
  monthlyBusinessIncomeStatus: FinancialEvidenceStatus;
  monthlyOperatingExpenses: string;
  monthlyOperatingExpensesStatus: FinancialEvidenceStatus;
  existingBusinessObligations: string;
  existingBusinessObligationsStatus: FinancialEvidenceStatus;
  proposedInstalment: string;
  proposedInstalmentStatus: FinancialEvidenceStatus;
  tradingHistoryMonths: string;
  financialStatementsStatus: FinancialEvidenceStatus;
};

export type FinancialAssessmentForm =
  IndividualFinancialAssessmentForm | BusinessFinancialAssessmentForm;

type FinancialField = {
  amountCents: number | null;
  evidenceStatus: FinancialEvidenceStatus;
};

export type FinancialAssessmentSnapshot =
  | {
      applicantType: "individual";
      netMonthlyIncome: FinancialField;
      livingExpenses: FinancialField;
      existingCommitments: FinancialField;
      proposedInstalment: FinancialField;
      disposableIncomeCents: number | null;
      postInstalmentHeadroomCents: number | null;
      completeAndVerified: boolean;
      reviewFlags: string[];
    }
  | {
      applicantType: "business";
      monthlyBusinessIncome: FinancialField;
      monthlyOperatingExpenses: FinancialField;
      existingBusinessObligations: FinancialField;
      proposedInstalment: FinancialField;
      tradingHistoryMonths: number | null;
      financialStatementsStatus: FinancialEvidenceStatus;
      availableCashFlowCents: number | null;
      postInstalmentHeadroomCents: number | null;
      completeAndVerified: boolean;
      reviewFlags: string[];
    };

function parseZarCents(
  value: string,
  field: string,
  allowZero: boolean,
): number | null {
  const normalized = value.trim();
  if (!normalized) return null;
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(normalized)) {
    throw new Error(
      `Enter a valid ZAR amount for ${field}, with up to two decimal places.`,
    );
  }
  const [whole, fraction = ""] = normalized.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || (allowZero ? cents < 0 : cents <= 0)) {
    throw new Error(
      `Enter a valid ${allowZero ? "non-negative" : "positive"} ZAR amount for ${field}.`,
    );
  }
  return cents;
}

function field(
  value: string,
  status: FinancialEvidenceStatus,
  label: string,
  allowZero = true,
): FinancialField {
  return {
    amountCents: parseZarCents(value, label, allowZero),
    evidenceStatus: status,
  };
}

function addReviewFlag(flags: string[], label: string, item: FinancialField) {
  if (item.amountCents === null) flags.push(`${label}: amount not recorded`);
  if (item.evidenceStatus !== "verified") {
    flags.push(`${label}: ${item.evidenceStatus.replaceAll("_", " ")}`);
  }
}

/**
 * Calculates transparent arithmetic only when every input used is independently
 * verified. Declared or unverifiable amounts remain visible but never enter the
 * verified affordability calculation.
 */
export function buildFinancialAssessmentSnapshot(
  input: FinancialAssessmentForm,
): FinancialAssessmentSnapshot {
  if (input.applicantType === "individual") {
    const netMonthlyIncome = field(
      input.netMonthlyIncome,
      input.netMonthlyIncomeStatus,
      "net monthly income",
      false,
    );
    const livingExpenses = field(
      input.livingExpenses,
      input.livingExpensesStatus,
      "living expenses",
    );
    const existingCommitments = field(
      input.existingCommitments,
      input.existingCommitmentsStatus,
      "existing commitments",
    );
    const proposedInstalment = field(
      input.proposedInstalment,
      input.proposedInstalmentStatus,
      "proposed instalment",
    );
    const reviewFlags: string[] = [];
    addReviewFlag(reviewFlags, "Net monthly income", netMonthlyIncome);
    addReviewFlag(reviewFlags, "Living expenses", livingExpenses);
    addReviewFlag(reviewFlags, "Existing commitments", existingCommitments);
    addReviewFlag(reviewFlags, "Proposed instalment", proposedInstalment);
    const baseVerified = [
      netMonthlyIncome,
      livingExpenses,
      existingCommitments,
    ].every(
      (item) => item.amountCents !== null && item.evidenceStatus === "verified",
    );
    const disposableIncomeCents = baseVerified
      ? netMonthlyIncome.amountCents! -
        livingExpenses.amountCents! -
        existingCommitments.amountCents!
      : null;
    const postInstalmentHeadroomCents =
      disposableIncomeCents !== null &&
      proposedInstalment.amountCents !== null &&
      proposedInstalment.evidenceStatus === "verified"
        ? disposableIncomeCents - proposedInstalment.amountCents
        : null;
    return {
      applicantType: "individual",
      netMonthlyIncome,
      livingExpenses,
      existingCommitments,
      proposedInstalment,
      disposableIncomeCents,
      postInstalmentHeadroomCents,
      completeAndVerified:
        baseVerified &&
        proposedInstalment.amountCents !== null &&
        proposedInstalment.evidenceStatus === "verified",
      reviewFlags,
    };
  }

  const monthlyBusinessIncome = field(
    input.monthlyBusinessIncome,
    input.monthlyBusinessIncomeStatus,
    "monthly business income",
    false,
  );
  const monthlyOperatingExpenses = field(
    input.monthlyOperatingExpenses,
    input.monthlyOperatingExpensesStatus,
    "monthly operating expenses",
  );
  const existingBusinessObligations = field(
    input.existingBusinessObligations,
    input.existingBusinessObligationsStatus,
    "existing business obligations",
  );
  const proposedInstalment = field(
    input.proposedInstalment,
    input.proposedInstalmentStatus,
    "proposed instalment",
  );
  const tradingHistoryMonths = input.tradingHistoryMonths.trim()
    ? Number(input.tradingHistoryMonths)
    : null;
  if (
    tradingHistoryMonths !== null &&
    (!Number.isSafeInteger(tradingHistoryMonths) ||
      tradingHistoryMonths < 0 ||
      tradingHistoryMonths > 1200)
  ) {
    throw new Error("Enter a valid trading history in whole months.");
  }
  const reviewFlags: string[] = [];
  addReviewFlag(reviewFlags, "Monthly business income", monthlyBusinessIncome);
  addReviewFlag(
    reviewFlags,
    "Monthly operating expenses",
    monthlyOperatingExpenses,
  );
  addReviewFlag(
    reviewFlags,
    "Existing business obligations",
    existingBusinessObligations,
  );
  addReviewFlag(reviewFlags, "Proposed instalment", proposedInstalment);
  if (tradingHistoryMonths === null)
    reviewFlags.push("Trading history: not recorded");
  if (input.financialStatementsStatus !== "verified") {
    reviewFlags.push(
      `Financial statements: ${input.financialStatementsStatus.replaceAll("_", " ")}`,
    );
  }
  const cashFlowVerified =
    [
      monthlyBusinessIncome,
      monthlyOperatingExpenses,
      existingBusinessObligations,
    ].every(
      (item) => item.amountCents !== null && item.evidenceStatus === "verified",
    ) && input.financialStatementsStatus === "verified";
  const availableCashFlowCents = cashFlowVerified
    ? monthlyBusinessIncome.amountCents! -
      monthlyOperatingExpenses.amountCents! -
      existingBusinessObligations.amountCents!
    : null;
  const postInstalmentHeadroomCents =
    availableCashFlowCents !== null &&
    proposedInstalment.amountCents !== null &&
    proposedInstalment.evidenceStatus === "verified"
      ? availableCashFlowCents - proposedInstalment.amountCents
      : null;
  return {
    applicantType: "business",
    monthlyBusinessIncome,
    monthlyOperatingExpenses,
    existingBusinessObligations,
    proposedInstalment,
    tradingHistoryMonths,
    financialStatementsStatus: input.financialStatementsStatus,
    availableCashFlowCents,
    postInstalmentHeadroomCents,
    completeAndVerified:
      cashFlowVerified &&
      proposedInstalment.amountCents !== null &&
      proposedInstalment.evidenceStatus === "verified" &&
      tradingHistoryMonths !== null,
    reviewFlags,
  };
}

export function formatCentsAsZarInput(
  value: number | null | undefined,
): string {
  if (value === null || value === undefined) return "";
  return (value / 100).toFixed(2);
}
