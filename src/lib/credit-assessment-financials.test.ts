import { describe, expect, it } from "vitest";
import { buildFinancialAssessmentSnapshot } from "./credit-assessment-financials";

describe("applicant-specific financial assessment", () => {
  it("calculates individual disposable income and proposed-instalment headroom only from verified inputs", () => {
    const result = buildFinancialAssessmentSnapshot({
      applicantType: "individual",
      netMonthlyIncome: "30000.00",
      netMonthlyIncomeStatus: "verified",
      livingExpenses: "8000.00",
      livingExpensesStatus: "verified",
      existingCommitments: "5000.00",
      existingCommitmentsStatus: "verified",
      proposedInstalment: "4000.00",
      proposedInstalmentStatus: "verified",
    });
    expect(result.applicantType).toBe("individual");
    if (result.applicantType !== "individual")
      throw new Error("Expected individual assessment");
    expect(result.disposableIncomeCents).toBe(1700000);
    expect(result.postInstalmentHeadroomCents).toBe(1300000);
    expect(result.completeAndVerified).toBe(true);
  });

  it("retains declared individual values but excludes them from verified affordability calculations", () => {
    const result = buildFinancialAssessmentSnapshot({
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
    if (result.applicantType !== "individual")
      throw new Error("Expected individual assessment");
    expect(result.netMonthlyIncome.amountCents).toBe(3000000);
    expect(result.disposableIncomeCents).toBeNull();
    expect(result.completeAndVerified).toBe(false);
    expect(result.reviewFlags).toContain(
      "Net monthly income: applicant declared",
    );
  });

  it("calculates business cash flow separately from individual disposable income", () => {
    const result = buildFinancialAssessmentSnapshot({
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
    expect(result.applicantType).toBe("business");
    if (result.applicantType !== "business")
      throw new Error("Expected business assessment");
    expect(result.availableCashFlowCents).toBe(6000000);
    expect(result.postInstalmentHeadroomCents).toBe(4000000);
    expect(result.completeAndVerified).toBe(true);
  });

  it("does not calculate business cash flow without verified financial statements", () => {
    const result = buildFinancialAssessmentSnapshot({
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
      financialStatementsStatus: "applicant_declared",
    });
    if (result.applicantType !== "business")
      throw new Error("Expected business assessment");
    expect(result.availableCashFlowCents).toBeNull();
    expect(result.completeAndVerified).toBe(false);
    expect(result.reviewFlags).toContain(
      "Financial statements: applicant declared",
    );
  });

  it("rejects malformed monetary amounts and non-whole trading-history values", () => {
    expect(() =>
      buildFinancialAssessmentSnapshot({
        applicantType: "individual",
        netMonthlyIncome: "1,2,3",
        netMonthlyIncomeStatus: "verified",
        livingExpenses: "0",
        livingExpensesStatus: "verified",
        existingCommitments: "0",
        existingCommitmentsStatus: "verified",
        proposedInstalment: "0",
        proposedInstalmentStatus: "verified",
      }),
    ).toThrow("valid ZAR amount");
    expect(() =>
      buildFinancialAssessmentSnapshot({
        applicantType: "business",
        monthlyBusinessIncome: "100",
        monthlyBusinessIncomeStatus: "verified",
        monthlyOperatingExpenses: "20",
        monthlyOperatingExpensesStatus: "verified",
        existingBusinessObligations: "10",
        existingBusinessObligationsStatus: "verified",
        proposedInstalment: "5",
        proposedInstalmentStatus: "verified",
        tradingHistoryMonths: "12.5",
        financialStatementsStatus: "verified",
      }),
    ).toThrow("whole months");
  });
});
