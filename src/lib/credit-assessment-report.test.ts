import { describe, expect, it } from "vitest";
import {
  CREDIT_ASSESSMENT_WEIGHTS,
  type CreditAssessmentDimension,
} from "./credit-assessment";
import {
  buildCreditAssessmentReport,
  CREDIT_ASSESSMENT_OUTCOMES,
  type CreditAssessmentReportInput,
} from "./credit-assessment-report";
import { buildFinancialAssessmentSnapshot } from "./credit-assessment-financials";

const dimensions = (score: number | null = null) =>
  (Object.keys(CREDIT_ASSESSMENT_WEIGHTS) as CreditAssessmentDimension[]).map(
    (dimension) => ({
      dimension,
      score,
      evidenceSummary: "Reviewed source evidence",
      missingInformation: "",
      reviewerNote: "",
    }),
  );

const reportInput = (
  overrides: Partial<CreditAssessmentReportInput> = {},
): CreditAssessmentReportInput => ({
  applicantType: "individual",
  outcome: null,
  applicationReference: "OBG-APP-20261110-ABC123",
  assessmentDate: "2026-11-10",
  reviewerName: "Assigned reviewer",
  scoringRulesVersion: "OBG-CR-1",
  scoringWeights: CREDIT_ASSESSMENT_WEIGHTS,
  financialAssessment: buildFinancialAssessmentSnapshot({
    applicantType: "individual",
    netMonthlyIncome: "30000",
    netMonthlyIncomeStatus: "verified",
    livingExpenses: "8000",
    livingExpensesStatus: "verified",
    existingCommitments: "5000",
    existingCommitmentsStatus: "verified",
    proposedInstalment: "4000",
    proposedInstalmentStatus: "verified",
  }),
  dimensions: dimensions(),
  reversalReview: {
    periodStart: "2026-08-10",
    periodEnd: "2026-11-10",
    verifiedReversalCount: 0,
    unverifiedCandidateCount: 0,
    requiresManualReview: false,
    explanation: null,
  },
  overallReviewerSummary: "",
  ...overrides,
});

describe("human-reviewed credit assessment report", () => {
  it("preserves the applicant-specific assessment path and all five reviewer outcomes", () => {
    const businessFinancialAssessment = buildFinancialAssessmentSnapshot({
      applicantType: "business",
      monthlyBusinessIncome: "150000",
      monthlyBusinessIncomeStatus: "verified",
      monthlyOperatingExpenses: "65000",
      monthlyOperatingExpensesStatus: "verified",
      existingBusinessObligations: "25000",
      existingBusinessObligationsStatus: "verified",
      proposedInstalment: "20000",
      proposedInstalmentStatus: "verified",
      tradingHistoryMonths: "36",
      financialStatementsStatus: "verified",
    });
    for (const outcome of CREDIT_ASSESSMENT_OUTCOMES) {
      const result = buildCreditAssessmentReport(
        reportInput({
          applicantType: "business",
          financialAssessment: businessFinancialAssessment,
          outcome,
        }),
      );
      expect(result.applicantType).toBe("business");
      expect(result.outcome).toBe(outcome);
    }
  });

  it("keeps an unselected preliminary outcome distinct from technical report status", () => {
    const result = buildCreditAssessmentReport(
      reportInput({ dimensions: dimensions(5) }),
    );
    expect(result.status).toBe("ready_for_human_decision");
    expect(result.outcome).toBeNull();
  });

  it("preserves evidence references and reviewer verification in the report snapshot", () => {
    const evidenceSnapshot = [
      {
        evidenceId: "e1",
        sourceDocumentId: "s1",
        statementPeriodStart: "2026-08-01",
        statementPeriodEnd: "2026-10-31",
        transactionDate: "2026-10-15",
        classification: "debit_order_reversal" as const,
        reviewVersion: 2,
        reviewerId: "r1",
        reviewedAt: "2026-11-10T10:00:00.000Z",
      },
    ];
    const result = buildCreditAssessmentReport(
      reportInput({ evidenceSnapshot }),
    );
    expect(result.evidenceSnapshot).toEqual(evidenceSnapshot);
  });
  it("uses the approved versioned scoring weights and rejects non-100-point rules", () => {
    const configuredWeights = {
      ...CREDIT_ASSESSMENT_WEIGHTS,
      verifiedIncomeAndStability: 25,
      affordabilityAndDisposableIncome: 25,
    };
    const result = buildCreditAssessmentReport(
      reportInput({
        scoringRulesVersion: "OBG-CR-2",
        scoringWeights: configuredWeights,
      }),
    );
    expect(result.scoringRulesVersion).toBe("OBG-CR-2");
    expect(result.scoringWeights).toEqual(configuredWeights);
    expect(result.maximumScore).toBe(100);
    const overLimitRows = dimensions();
    overLimitRows[1] = { ...overLimitRows[1], score: 26 };
    expect(() =>
      buildCreditAssessmentReport(
        reportInput({
          scoringWeights: configuredWeights,
          dimensions: overLimitRows,
        }),
      ),
    ).toThrow("between 0 and 25");
    expect(() =>
      buildCreditAssessmentReport(
        reportInput({
          scoringWeights: {
            ...CREDIT_ASSESSMENT_WEIGHTS,
            documentConsistencyAndVerification: 9,
          },
        }),
      ),
    ).toThrow("approved 100-point scoring ruleset");
  });

  it("blocks readiness when individual affordability inputs are not verified", () => {
    const financialAssessment = buildFinancialAssessmentSnapshot({
      applicantType: "individual",
      netMonthlyIncome: "30000",
      netMonthlyIncomeStatus: "applicant_declared",
      livingExpenses: "8000",
      livingExpensesStatus: "verified",
      existingCommitments: "5000",
      existingCommitmentsStatus: "verified",
      proposedInstalment: "4000",
      proposedInstalmentStatus: "verified",
    });
    const result = buildCreditAssessmentReport(
      reportInput({ dimensions: dimensions(5), financialAssessment }),
    );
    expect(result.status).toBe("in_progress");
    expect(result.missingInformation).toContain(
      "Net monthly income: applicant declared",
    );
    if (result.financialAssessment.applicantType === "individual") {
      expect(result.financialAssessment.disposableIncomeCents).toBeNull();
    } else {
      throw new Error("Expected individual financial assessment");
    }
    expect(result.scoringRulesVersion).toBe("OBG-CR-1");
  });

  it("does not invent a score when reviewer scoring is incomplete", () => {
    const result = buildCreditAssessmentReport(reportInput());
    expect(result.totalScore).toBeNull();
    expect(result.completedDimensions).toBe(0);
    expect(result.status).toBe("not_started");
  });

  it("totals only scores explicitly entered by the reviewer", () => {
    const result = buildCreditAssessmentReport(
      reportInput({ dimensions: dimensions(5) }),
    );
    expect(result.totalScore).toBe(30);
    expect(result.completedDimensions).toBe(6);
    expect(result.status).toBe("ready_for_human_decision");
  });

  it("does not mark a report ready when evidence is missing", () => {
    const entries = dimensions(5);
    entries[0] = {
      ...entries[0],
      missingInformation: "Latest payslip required",
    };
    const result = buildCreditAssessmentReport(
      reportInput({ dimensions: entries }),
    );
    expect(result.totalScore).toBe(30);
    expect(result.status).toBe("in_progress");
    expect(result.missingInformation).toContain(
      "verifiedIncomeAndStability: Latest payslip required",
    );
  });

  it("keeps reversal candidates in human review and blocks readiness", () => {
    const result = buildCreditAssessmentReport(
      reportInput({
        dimensions: dimensions(5),
        reversalReview: {
          periodStart: "2026-08-10",
          periodEnd: "2026-11-10",
          verifiedReversalCount: 0,
          unverifiedCandidateCount: 1,
          requiresManualReview: true,
          explanation: "One statement entry needs classification.",
        },
      }),
    );
    expect(result.totalScore).toBe(30);
    expect(result.status).toBe("in_progress");
  });

  it("rejects scores outside each dimension maximum", () => {
    const entries = dimensions();
    entries[0] = {
      ...entries[0],
      score: CREDIT_ASSESSMENT_WEIGHTS.verifiedIncomeAndStability + 1,
    };
    expect(() =>
      buildCreditAssessmentReport(reportInput({ dimensions: entries })),
    ).toThrow("must be between");
  });

  it("rejects duplicate or missing assessment dimensions", () => {
    const entries = dimensions();
    entries[1] = { ...entries[0] };
    expect(() =>
      buildCreditAssessmentReport(reportInput({ dimensions: entries })),
    ).toThrow("exactly one review entry");
  });

  it("requires manual review when more than two verified reversals are recorded, even if the flag is inconsistent", () => {
    const result = buildCreditAssessmentReport(
      reportInput({
        dimensions: dimensions(5),
        reversalReview: {
          periodStart: "2026-08-10",
          periodEnd: "2026-11-10",
          verifiedReversalCount: 3,
          unverifiedCandidateCount: 0,
          requiresManualReview: false,
          explanation: null,
        },
      }),
    );
    expect(result.status).toBe("in_progress");
  });

  it("rejects negative or fractional reversal counts", () => {
    expect(() =>
      buildCreditAssessmentReport(
        reportInput({
          reversalReview: {
            periodStart: "2026-08-10",
            periodEnd: "2026-11-10",
            verifiedReversalCount: -1,
            unverifiedCandidateCount: 0,
            requiresManualReview: false,
            explanation: null,
          },
        }),
      ),
    ).toThrow("non-negative whole number");
    expect(() =>
      buildCreditAssessmentReport(
        reportInput({
          reversalReview: {
            periodStart: "2026-08-10",
            periodEnd: "2026-11-10",
            verifiedReversalCount: 0,
            unverifiedCandidateCount: 0.5,
            requiresManualReview: false,
            explanation: null,
          },
        }),
      ),
    ).toThrow("non-negative whole number");
  });

  it("always carries a clear non-decision notice", () => {
    const result = buildCreditAssessmentReport(reportInput());
    expect(result.decisionNotice).toContain(
      "does not approve, decline, pre-approve or guarantee finance",
    );
  });
});
