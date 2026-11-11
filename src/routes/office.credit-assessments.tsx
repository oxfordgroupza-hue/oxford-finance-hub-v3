import { useState } from "react";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WorkspaceSignOutButton } from "@/components/site/WorkspaceSignOutButton";
import { getAuthorizationSnapshot } from "@/lib/auth";
import {
  getCreditAssessmentQueue,
  getCreditAssessmentReport,
  recordDebitOrderTransactionEvidence,
  reviewDebitOrderTransactionEvidence,
  saveCreditAssessmentReport,
} from "@/lib/credit-assessment-actions";
import type { CreditAssessmentDimension } from "@/lib/credit-assessment";
import type { CreditAssessmentOutcome } from "@/lib/credit-assessment-report";
import {
  formatCentsAsZarInput,
  type FinancialAssessmentForm,
  type FinancialAssessmentSnapshot,
  type FinancialEvidenceStatus,
} from "@/lib/credit-assessment-financials";

const dimensions: Array<{
  key: CreditAssessmentDimension;
  label: string;
  maximum: number;
}> = [
  {
    key: "verifiedIncomeAndStability",
    label: "Verified income and stability",
    maximum: 20,
  },
  {
    key: "affordabilityAndDisposableIncome",
    label: "Affordability and disposable income",
    maximum: 30,
  },
  {
    key: "existingFinancialCommitments",
    label: "Existing financial commitments",
    maximum: 15,
  },
  {
    key: "bankStatementBehaviour",
    label: "Bank statement behaviour",
    maximum: 15,
  },
  {
    key: "employmentOrBusinessStability",
    label: "Employment or business stability",
    maximum: 10,
  },
  {
    key: "documentConsistencyAndVerification",
    label: "Document consistency and verification",
    maximum: 10,
  },
];

type ReviewRow = {
  dimension: CreditAssessmentDimension;
  score: number | null;
  evidenceSummary: string;
  missingInformation: string;
  reviewerNote: string;
};
type BankStatementDocument = {
  id: string;
  filename: string;
  uploadedAt: string | null;
};
type TransactionEvidence = {
  id: string;
  sourceDocumentId: string;
  sourceDocumentName: string;
  sourceDocumentStatus: string;
  statementPeriodStart: string | null;
  statementPeriodEnd: string | null;
  transactionDate: string;
  amountCents: number;
  description: string;
  classification: string;
  latestReviewVersion: number;
  reviewerNote: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
};
type ReversalSummary = {
  periodStart?: string;
  periodEnd?: string;
  verifiedReversalCount: number;
  unverifiedCandidateCount: number;
  requiresManualReview: boolean;
  explanation: string | null;
};
const blankRows = (): ReviewRow[] =>
  dimensions.map((item) => ({
    dimension: item.key,
    score: null,
    evidenceSummary: "",
    missingInformation: "",
    reviewerNote: "",
  }));

const blankFinancialAssessment = (
  applicantType: "individual" | "business",
): FinancialAssessmentForm =>
  applicantType === "individual"
    ? {
        applicantType,
        netMonthlyIncome: "",
        netMonthlyIncomeStatus: "applicant_declared",
        livingExpenses: "",
        livingExpensesStatus: "applicant_declared",
        existingCommitments: "",
        existingCommitmentsStatus: "applicant_declared",
        proposedInstalment: "",
        proposedInstalmentStatus: "applicant_declared",
      }
    : {
        applicantType,
        monthlyBusinessIncome: "",
        monthlyBusinessIncomeStatus: "applicant_declared",
        monthlyOperatingExpenses: "",
        monthlyOperatingExpensesStatus: "applicant_declared",
        existingBusinessObligations: "",
        existingBusinessObligationsStatus: "applicant_declared",
        proposedInstalment: "",
        proposedInstalmentStatus: "applicant_declared",
        tradingHistoryMonths: "",
        financialStatementsStatus: "applicant_declared",
      };

function financialAssessmentToForm(
  snapshot: FinancialAssessmentSnapshot | undefined,
  applicantType: "individual" | "business",
): FinancialAssessmentForm {
  if (applicantType === "individual") {
    if (!snapshot || snapshot.applicantType !== "individual")
      return blankFinancialAssessment("individual");
    return {
      applicantType: "individual",
      netMonthlyIncome: formatCentsAsZarInput(
        snapshot.netMonthlyIncome.amountCents,
      ),
      netMonthlyIncomeStatus: snapshot.netMonthlyIncome.evidenceStatus,
      livingExpenses: formatCentsAsZarInput(
        snapshot.livingExpenses.amountCents,
      ),
      livingExpensesStatus: snapshot.livingExpenses.evidenceStatus,
      existingCommitments: formatCentsAsZarInput(
        snapshot.existingCommitments.amountCents,
      ),
      existingCommitmentsStatus: snapshot.existingCommitments.evidenceStatus,
      proposedInstalment: formatCentsAsZarInput(
        snapshot.proposedInstalment.amountCents,
      ),
      proposedInstalmentStatus: snapshot.proposedInstalment.evidenceStatus,
    };
  }
  if (!snapshot || snapshot.applicantType !== "business")
    return blankFinancialAssessment("business");
  return {
    applicantType: "business",
    monthlyBusinessIncome: formatCentsAsZarInput(
      snapshot.monthlyBusinessIncome.amountCents,
    ),
    monthlyBusinessIncomeStatus: snapshot.monthlyBusinessIncome.evidenceStatus,
    monthlyOperatingExpenses: formatCentsAsZarInput(
      snapshot.monthlyOperatingExpenses.amountCents,
    ),
    monthlyOperatingExpensesStatus:
      snapshot.monthlyOperatingExpenses.evidenceStatus,
    existingBusinessObligations: formatCentsAsZarInput(
      snapshot.existingBusinessObligations.amountCents,
    ),
    existingBusinessObligationsStatus:
      snapshot.existingBusinessObligations.evidenceStatus,
    proposedInstalment: formatCentsAsZarInput(
      snapshot.proposedInstalment.amountCents,
    ),
    proposedInstalmentStatus: snapshot.proposedInstalment.evidenceStatus,
    tradingHistoryMonths:
      snapshot.tradingHistoryMonths === null
        ? ""
        : String(snapshot.tradingHistoryMonths),
    financialStatementsStatus: snapshot.financialStatementsStatus,
  };
}

function EvidenceStatusSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: FinancialEvidenceStatus;
  onChange: (value: FinancialEvidenceStatus) => void;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(event) =>
        onChange(event.target.value as FinancialEvidenceStatus)
      }
      className="w-full rounded-sm border border-border bg-card px-3 py-2.5 text-sm"
    >
      <option value="verified">Verified against source documents</option>
      <option value="applicant_declared">Applicant-declared</option>
      <option value="independently_unverifiable">
        Independently unverifiable
      </option>
    </select>
  );
}

function EvidenceAmountField({
  id,
  label,
  value,
  status,
  onValueChange,
  onStatusChange,
}: {
  id: string;
  label: string;
  value: string;
  status: FinancialEvidenceStatus;
  onValueChange: (value: string) => void;
  onStatusChange: (value: FinancialEvidenceStatus) => void;
}) {
  return (
    <div className="space-y-2 rounded-sm border border-border p-3">
      <Label htmlFor={id}>{label} (ZAR per month)</Label>
      <Input
        id={id}
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder="0.00"
      />
      <Label htmlFor={id + "-status"}>Evidence status</Label>
      <EvidenceStatusSelect
        id={id + "-status"}
        value={status}
        onChange={onStatusChange}
      />
    </div>
  );
}

export const Route = createFileRoute("/office/credit-assessments")({
  beforeLoad: async () => {
    const session = await getAuthorizationSnapshot();
    if (!session.authenticated || !session.provisioned || session.blocked)
      throw redirect({ to: "/login" });
    if (
      session.user.accountType !== "office" ||
      (!session.isSuperAdmin &&
        !session.permissions.includes("credit_assessments.view"))
    )
      throw redirect({ to: "/office" });
  },
  loader: async () => getCreditAssessmentQueue(),
  head: () => ({
    meta: [
      { title: "Credit assessment review | Oxford Finance Hub" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CreditAssessmentsPage,
});

function CreditAssessmentsPage() {
  const queueData = Route.useLoaderData();
  const queue = queueData.applications;
  const canCreate = queueData.canCreate;
  const canEdit = queueData.canEdit;
  const router = useRouter();
  const [selected, setSelected] = useState<(typeof queue)[number] | null>(null);
  const canSave = selected
    ? selected.reportStatus
      ? canEdit
      : canCreate
    : false;
  const [rows, setRows] = useState<ReviewRow[]>(blankRows);
  const [financialAssessment, setFinancialAssessment] =
    useState<FinancialAssessmentForm>(() =>
      blankFinancialAssessment("individual"),
    );
  const [financialAssessmentResult, setFinancialAssessmentResult] =
    useState<FinancialAssessmentSnapshot | null>(null);
  const [assessmentDate, setAssessmentDate] = useState("");
  const [outcome, setOutcome] = useState<CreditAssessmentOutcome | null>(null);
  const [summary, setSummary] = useState("");
  const [versions, setVersions] = useState<
    Array<{ version: number; status: string; createdAt: string }>
  >([]);
  const [bankStatementDocuments, setBankStatementDocuments] = useState<
    BankStatementDocument[]
  >([]);
  const [transactionEvidence, setTransactionEvidence] = useState<
    TransactionEvidence[]
  >([]);
  const [reversalSummary, setReversalSummary] =
    useState<ReversalSummary | null>(null);
  const [evidenceDocumentId, setEvidenceDocumentId] = useState("");
  const [statementPeriodStart, setStatementPeriodStart] = useState("");
  const [statementPeriodEnd, setStatementPeriodEnd] = useState("");
  const [evidenceDate, setEvidenceDate] = useState("");
  const [evidenceAmount, setEvidenceAmount] = useState("");
  const [evidenceDescription, setEvidenceDescription] = useState("");
  const [reviewerNote, setReviewerNote] = useState("");
  const [busy, setBusy] = useState(false);

  const openApplication = async (application: (typeof queue)[number]) => {
    setBusy(true);
    try {
      const result = await getCreditAssessmentReport({
        data: { applicationId: application.id },
      });
      setSelected(application);
      setVersions(result.versions);
      setBankStatementDocuments(result.bankStatementDocuments);
      setTransactionEvidence(result.transactionEvidence);
      setEvidenceDocumentId(result.bankStatementDocuments[0]?.id ?? "");
      setStatementPeriodStart("");
      setStatementPeriodEnd("");
      setEvidenceDate("");
      setEvidenceAmount("");
      setEvidenceDescription("");
      setReviewerNote("");
      if (result.report) {
        const saved = result.report.report as {
          assessmentDate: string;
          outcome: CreditAssessmentOutcome | null;
          dimensions: ReviewRow[];
          reversalReview: ReversalSummary;
          overallReviewerSummary: string;
          financialAssessment?: FinancialAssessmentSnapshot;
        };
        setAssessmentDate(saved.assessmentDate);
        setOutcome(saved.outcome ?? null);
        setRows(saved.dimensions);
        setFinancialAssessment(
          financialAssessmentToForm(
            saved.financialAssessment,
            application.applicantType,
          ),
        );
        setFinancialAssessmentResult(saved.financialAssessment ?? null);
        setReversalSummary(saved.reversalReview);
        setSummary(saved.overallReviewerSummary);
      } else {
        setAssessmentDate(new Date().toISOString().slice(0, 10));
        setOutcome(null);
        setRows(blankRows());
        setFinancialAssessment(
          blankFinancialAssessment(application.applicantType),
        );
        setFinancialAssessmentResult(null);
        setReversalSummary(null);
        setSummary("");
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The assessment could not be opened.",
      );
    } finally {
      setBusy(false);
    }
  };

  const updateRow = (index: number, patch: Partial<ReviewRow>) => {
    setRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row,
      ),
    );
  };

  const updateFinancialField = (
    key: string,
    value: string | FinancialEvidenceStatus,
  ) => {
    setFinancialAssessment(
      (current) => ({ ...current, [key]: value }) as FinancialAssessmentForm,
    );
    setFinancialAssessmentResult(null);
  };

  const save = async () => {
    if (!selected || busy) return;
    setBusy(true);
    try {
      const result = await saveCreditAssessmentReport({
        data: {
          applicationId: selected.id,
          assessmentDate,
          outcome,
          dimensions: rows,
          financialAssessment,
          overallReviewerSummary: summary,
        },
      });
      toast.success(
        `Assessment version ${result.version} saved. Status: ${result.status.replaceAll("_", " ")}.`,
      );
      await router.invalidate();
      const refreshed = await getCreditAssessmentReport({
        data: { applicationId: selected.id },
      });
      setVersions(refreshed.versions);
      setBankStatementDocuments(refreshed.bankStatementDocuments);
      setTransactionEvidence(refreshed.transactionEvidence);
      const savedReport = refreshed.report?.report as
        | {
            reversalReview: ReversalSummary;
            financialAssessment?: FinancialAssessmentSnapshot;
          }
        | undefined;
      setReversalSummary(savedReport?.reversalReview ?? null);
      setFinancialAssessmentResult(savedReport?.financialAssessment ?? null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The assessment could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  };

  const refreshEvidence = async () => {
    if (!selected) return;
    const refreshed = await getCreditAssessmentReport({
      data: { applicationId: selected.id },
    });
    setBankStatementDocuments(refreshed.bankStatementDocuments);
    setTransactionEvidence(refreshed.transactionEvidence);
    setVersions(refreshed.versions);
  };

  const addTransactionEvidence = async () => {
    if (
      !selected ||
      busy ||
      !evidenceDocumentId ||
      !statementPeriodStart ||
      !statementPeriodEnd ||
      !evidenceDate ||
      !evidenceAmount ||
      !evidenceDescription.trim()
    )
      return;
    setBusy(true);
    try {
      await recordDebitOrderTransactionEvidence({
        data: {
          applicationId: selected.id,
          sourceDocumentId: evidenceDocumentId,
          statementPeriodStart,
          statementPeriodEnd,
          transactionDate: evidenceDate,
          amount: evidenceAmount,
          description: evidenceDescription,
        },
      });
      toast.success(
        "Transaction evidence recorded as an unverified candidate.",
      );
      setEvidenceDate("");
      setEvidenceAmount("");
      setEvidenceDescription("");
      setReversalSummary(null);
      await refreshEvidence();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Transaction evidence could not be recorded.",
      );
    } finally {
      setBusy(false);
    }
  };

  const reviewTransactionEvidence = async (
    evidenceId: string,
    classification: "debit_order_reversal" | "not_a_debit_order_reversal",
  ) => {
    if (!selected || busy) return;
    setBusy(true);
    try {
      const result = await reviewDebitOrderTransactionEvidence({
        data: {
          applicationId: selected.id,
          evidenceId,
          classification,
          reviewerNote,
        },
      });
      toast.success(`Evidence review version ${result.version} recorded.`);
      setReviewerNote("");
      setReversalSummary(null);
      await refreshEvidence();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The transaction evidence could not be reviewed.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card px-5 py-5 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Oxford Business Group</p>
            <h1 className="mt-1 font-display text-3xl">
              Credit assessment review
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Internal evidence worksheet. All scores require reviewer
              judgement; no automated lending decision is made.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="outlineGold">
              <a href="/office">Back to office</a>
            </Button>
            <WorkspaceSignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto grid max-w-7xl gap-7 px-5 py-8 lg:grid-cols-[minmax(260px,0.75fr)_minmax(0,1.5fr)] sm:px-8">
        <section className="space-y-3">
          <div>
            <h2 className="text-xl">Assigned applications</h2>
            <p className="text-sm text-muted-foreground">
              Reviewers see only their active assignments. Authorised
              administrators can see the full queue.
            </p>
          </div>
          {queue.length ? (
            queue.map((application) => (
              <button
                key={application.id}
                type="button"
                onClick={() => openApplication(application)}
                className={`w-full rounded-sm border p-4 text-left transition hover:border-gold ${selected?.id === application.id ? "border-gold bg-muted" : "border-border bg-card"}`}
              >
                <span className="block font-semibold">
                  {application.reference}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Application: {application.applicationStatus}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Assessment: {application.reportStatus ?? "Not started"}
                  {application.latestVersion
                    ? ` · v${application.latestVersion}`
                    : ""}
                </span>
              </button>
            ))
          ) : (
            <p className="rounded-sm border border-border p-5 text-sm text-muted-foreground">
              No applications are currently available in your review queue.
            </p>
          )}
        </section>

        <section className="min-w-0 space-y-6 rounded-sm border border-border bg-card p-5 sm:p-7">
          {!selected ? (
            <div>
              <h2 className="text-xl">Select an application</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Choose an assigned application to open its private assessment
                worksheet.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-gold">
                    Application reference
                  </p>
                  <h2 className="mt-1 text-2xl">{selected.reference}</h2>
                </div>
                <div className="text-xs text-muted-foreground">
                  Saved versions: {versions.length}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="assessment-date">Assessment date</Label>
                  <Input
                    id="assessment-date"
                    type="date"
                    value={assessmentDate}
                    onChange={(event) => {
                      setAssessmentDate(event.target.value);
                      setReversalSummary(null);
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assessment-outcome">
                    Preliminary Oxford assessment outcome
                  </Label>
                  <select
                    id="assessment-outcome"
                    value={outcome ?? ""}
                    onChange={(event) =>
                      setOutcome(
                        (event.target.value ||
                          null) as CreditAssessmentOutcome | null,
                      )
                    }
                    className="w-full rounded-sm border border-border bg-background px-3 py-2.5 text-sm"
                  >
                    <option value="">Not yet selected</option>
                    <option value="strong_preliminary_profile">
                      Strong preliminary profile
                    </option>
                    <option value="conditional_further_information">
                      Conditional — further information required
                    </option>
                    <option value="manual_review">Manual review</option>
                    <option value="insufficient_information">
                      Insufficient information
                    </option>
                    <option value="not_recommended_under_current_criteria">
                      Not recommended for submission under current Oxford
                      criteria
                    </option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Human reviewer selection only. This is not a lender approval
                    or decline.
                  </p>
                </div>
              </div>
              <div className="rounded-sm border border-border bg-background p-4 text-sm">
                <p className="font-semibold">
                  {selected.applicantType === "business"
                    ? "Business assessment path"
                    : "Individual assessment path"}
                </p>
                <p className="mt-1 text-muted-foreground">
                  {selected.applicantType === "business"
                    ? "Assess business cash flow, bank statements, trading history, operating expenses, financial obligations and business stability. Record which facts are verified, declared or still unverified in each evidence summary."
                    : "Assess personal verified income, employment stability, disposable income, existing commitments, bank-statement behaviour and consistency of identity and supporting documents. Distinguish verified facts from applicant declarations and missing evidence."}
                </p>
              </div>
              <div className="space-y-4 border-t border-border pt-5">
                <div>
                  <h3 className="text-lg">
                    {financialAssessment.applicantType === "business"
                      ? "Business cash-flow assessment"
                      : "Individual affordability assessment"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Record each monthly amount and classify its evidence.
                    Applicant-declared or independently unverifiable figures are
                    retained but excluded from verified calculations.
                  </p>
                </div>
                {financialAssessment.applicantType === "individual" ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <EvidenceAmountField
                      id="net-monthly-income"
                      label="Verified net monthly income"
                      value={financialAssessment.netMonthlyIncome}
                      status={financialAssessment.netMonthlyIncomeStatus}
                      onValueChange={(value) =>
                        updateFinancialField("netMonthlyIncome", value)
                      }
                      onStatusChange={(value) =>
                        updateFinancialField("netMonthlyIncomeStatus", value)
                      }
                    />
                    <EvidenceAmountField
                      id="living-expenses"
                      label="Monthly living expenses"
                      value={financialAssessment.livingExpenses}
                      status={financialAssessment.livingExpensesStatus}
                      onValueChange={(value) =>
                        updateFinancialField("livingExpenses", value)
                      }
                      onStatusChange={(value) =>
                        updateFinancialField("livingExpensesStatus", value)
                      }
                    />
                    <EvidenceAmountField
                      id="existing-commitments"
                      label="Existing debt and repayment commitments"
                      value={financialAssessment.existingCommitments}
                      status={financialAssessment.existingCommitmentsStatus}
                      onValueChange={(value) =>
                        updateFinancialField("existingCommitments", value)
                      }
                      onStatusChange={(value) =>
                        updateFinancialField("existingCommitmentsStatus", value)
                      }
                    />
                    <EvidenceAmountField
                      id="individual-proposed-instalment"
                      label="Proposed monthly finance instalment"
                      value={financialAssessment.proposedInstalment}
                      status={financialAssessment.proposedInstalmentStatus}
                      onValueChange={(value) =>
                        updateFinancialField("proposedInstalment", value)
                      }
                      onStatusChange={(value) =>
                        updateFinancialField("proposedInstalmentStatus", value)
                      }
                    />
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <EvidenceAmountField
                      id="business-monthly-income"
                      label="Average monthly business income / receipts"
                      value={financialAssessment.monthlyBusinessIncome}
                      status={financialAssessment.monthlyBusinessIncomeStatus}
                      onValueChange={(value) =>
                        updateFinancialField("monthlyBusinessIncome", value)
                      }
                      onStatusChange={(value) =>
                        updateFinancialField(
                          "monthlyBusinessIncomeStatus",
                          value,
                        )
                      }
                    />
                    <EvidenceAmountField
                      id="business-operating-expenses"
                      label="Monthly operating expenses"
                      value={financialAssessment.monthlyOperatingExpenses}
                      status={
                        financialAssessment.monthlyOperatingExpensesStatus
                      }
                      onValueChange={(value) =>
                        updateFinancialField("monthlyOperatingExpenses", value)
                      }
                      onStatusChange={(value) =>
                        updateFinancialField(
                          "monthlyOperatingExpensesStatus",
                          value,
                        )
                      }
                    />
                    <EvidenceAmountField
                      id="business-obligations"
                      label="Existing business debt and obligations"
                      value={financialAssessment.existingBusinessObligations}
                      status={
                        financialAssessment.existingBusinessObligationsStatus
                      }
                      onValueChange={(value) =>
                        updateFinancialField(
                          "existingBusinessObligations",
                          value,
                        )
                      }
                      onStatusChange={(value) =>
                        updateFinancialField(
                          "existingBusinessObligationsStatus",
                          value,
                        )
                      }
                    />
                    <EvidenceAmountField
                      id="business-proposed-instalment"
                      label="Proposed monthly finance instalment"
                      value={financialAssessment.proposedInstalment}
                      status={financialAssessment.proposedInstalmentStatus}
                      onValueChange={(value) =>
                        updateFinancialField("proposedInstalment", value)
                      }
                      onStatusChange={(value) =>
                        updateFinancialField("proposedInstalmentStatus", value)
                      }
                    />
                    <div className="space-y-2 rounded-sm border border-border p-3">
                      <Label htmlFor="trading-history-months">
                        Trading history (months)
                      </Label>
                      <Input
                        id="trading-history-months"
                        type="number"
                        min="0"
                        max="1200"
                        step="1"
                        value={financialAssessment.tradingHistoryMonths}
                        onChange={(event) =>
                          updateFinancialField(
                            "tradingHistoryMonths",
                            event.target.value,
                          )
                        }
                      />
                      <Label htmlFor="financial-statements-status">
                        Financial statements evidence status
                      </Label>
                      <EvidenceStatusSelect
                        id="financial-statements-status"
                        value={financialAssessment.financialStatementsStatus}
                        onChange={(value) =>
                          updateFinancialField(
                            "financialStatementsStatus",
                            value,
                          )
                        }
                      />
                    </div>
                  </div>
                )}
                {financialAssessmentResult && (
                  <div className="rounded-sm border border-border bg-background p-4 text-sm">
                    <p className="font-semibold">
                      Verified affordability calculation
                    </p>
                    {financialAssessmentResult.applicantType ===
                    "individual" ? (
                      <>
                        <p className="mt-2">
                          Disposable income:{" "}
                          <strong>
                            {financialAssessmentResult.disposableIncomeCents ===
                            null
                              ? "Not calculated — inputs are incomplete or not all verified"
                              : `R${formatCentsAsZarInput(financialAssessmentResult.disposableIncomeCents)}`}
                          </strong>
                        </p>
                        <p>
                          After proposed instalment:{" "}
                          <strong>
                            {financialAssessmentResult.postInstalmentHeadroomCents ===
                            null
                              ? "Not calculated"
                              : `R${formatCentsAsZarInput(financialAssessmentResult.postInstalmentHeadroomCents)}`}
                          </strong>
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="mt-2">
                          Available business cash flow before proposed
                          instalment:{" "}
                          <strong>
                            {financialAssessmentResult.availableCashFlowCents ===
                            null
                              ? "Not calculated — inputs or financial statements are incomplete or not all verified"
                              : `R${formatCentsAsZarInput(financialAssessmentResult.availableCashFlowCents)}`}
                          </strong>
                        </p>
                        <p>
                          After proposed instalment:{" "}
                          <strong>
                            {financialAssessmentResult.postInstalmentHeadroomCents ===
                            null
                              ? "Not calculated"
                              : `R${formatCentsAsZarInput(financialAssessmentResult.postInstalmentHeadroomCents)}`}
                          </strong>
                        </p>
                      </>
                    )}
                    {!financialAssessmentResult.completeAndVerified && (
                      <ul className="mt-2 list-disc pl-5 text-xs text-muted-foreground">
                        {financialAssessmentResult.reviewFlags.map((flag) => (
                          <li key={flag}>{flag}</li>
                        ))}
                      </ul>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                      Arithmetic is an internal reviewer aid only, not an
                      automated approval, decline or lender decision.
                    </p>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg">Evidence dimensions</h3>
                  <p className="text-xs text-muted-foreground">
                    Enter a score only when supported by verified evidence. The
                    current 100-point weighting is a draft baseline, not an
                    approved Oxford ruleset; configurable weighting and formal
                    approval remain outstanding.
                  </p>
                </div>
                {dimensions.map((dimension, index) => (
                  <div
                    key={dimension.key}
                    className="space-y-3 border-t border-border pt-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Label>{dimension.label}</Label>
                      <span className="text-xs text-muted-foreground">
                        Maximum {dimension.maximum} points
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
                      <div className="space-y-1">
                        <Label htmlFor={`score-${dimension.key}`}>
                          Reviewer score
                        </Label>
                        <Input
                          id={`score-${dimension.key}`}
                          type="number"
                          min={0}
                          max={dimension.maximum}
                          step={1}
                          placeholder="Not scored"
                          value={rows[index].score ?? ""}
                          onChange={(event) =>
                            updateRow(index, {
                              score:
                                event.target.value === ""
                                  ? null
                                  : Number(event.target.value),
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`evidence-${dimension.key}`}>
                          Evidence summary
                        </Label>
                        <Textarea
                          id={`evidence-${dimension.key}`}
                          value={rows[index].evidenceSummary}
                          onChange={(event) =>
                            updateRow(index, {
                              evidenceSummary: event.target.value,
                            })
                          }
                          maxLength={4000}
                        />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor={`missing-${dimension.key}`}>
                          Missing information
                        </Label>
                        <Textarea
                          id={`missing-${dimension.key}`}
                          value={rows[index].missingInformation}
                          onChange={(event) =>
                            updateRow(index, {
                              missingInformation: event.target.value,
                            })
                          }
                          maxLength={4000}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`note-${dimension.key}`}>
                          Reviewer note
                        </Label>
                        <Textarea
                          id={`note-${dimension.key}`}
                          value={rows[index].reviewerNote}
                          onChange={(event) =>
                            updateRow(index, {
                              reviewerNote: event.target.value,
                            })
                          }
                          maxLength={4000}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-4 border-t border-border pt-5">
                <div>
                  <h3 className="text-lg">
                    Bank-statement transaction evidence
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Transactions must be transcribed from a verified bank
                    statement. A reviewer must classify each candidate; the
                    server calculates the latest three-month reversal count from
                    the stored review history.
                  </p>
                </div>
                {reversalSummary && (
                  <div className="rounded-sm border border-border bg-background p-3 text-sm">
                    <p>
                      Assessment window:{" "}
                      <strong>
                        {reversalSummary.periodStart ?? "Not recorded"} to{" "}
                        {reversalSummary.periodEnd ?? "Not recorded"}
                      </strong>
                    </p>
                    <p>
                      Verified debit-order reversals in the saved three-month
                      window:{" "}
                      <strong>{reversalSummary.verifiedReversalCount}</strong>
                    </p>
                    <p>
                      Unverified candidates:{" "}
                      <strong>
                        {reversalSummary.unverifiedCandidateCount}
                      </strong>
                    </p>
                    <p>
                      Additional manual review:{" "}
                      <strong>
                        {reversalSummary.requiresManualReview
                          ? "Required"
                          : "Not currently triggered"}
                      </strong>
                    </p>
                    {reversalSummary.explanation && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {reversalSummary.explanation}
                      </p>
                    )}
                  </div>
                )}
                <div className="space-y-3 rounded-sm border border-border bg-background p-4">
                  <h4 className="text-sm font-semibold">
                    Add a transaction candidate
                  </h4>
                  {bankStatementDocuments.length ? (
                    <>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="space-y-1 text-sm">
                          <span className="block text-muted-foreground">
                            Verified bank statement
                          </span>
                          <select
                            value={evidenceDocumentId}
                            onChange={(event) =>
                              setEvidenceDocumentId(event.target.value)
                            }
                            className="w-full rounded-sm border border-border bg-card px-3 py-2.5"
                          >
                            {bankStatementDocuments.map((document) => (
                              <option key={document.id} value={document.id}>
                                {document.filename}
                              </option>
                            ))}
                          </select>
                        </label>
                        <div className="space-y-1">
                          <Label htmlFor="statement-period-start">
                            Statement period start
                          </Label>
                          <Input
                            id="statement-period-start"
                            type="date"
                            value={statementPeriodStart}
                            onChange={(event) =>
                              setStatementPeriodStart(event.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="statement-period-end">
                            Statement period end
                          </Label>
                          <Input
                            id="statement-period-end"
                            type="date"
                            value={statementPeriodEnd}
                            onChange={(event) =>
                              setStatementPeriodEnd(event.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="transaction-date">
                            Transaction date
                          </Label>
                          <Input
                            id="transaction-date"
                            type="date"
                            min={statementPeriodStart || undefined}
                            max={statementPeriodEnd || undefined}
                            value={evidenceDate}
                            onChange={(event) =>
                              setEvidenceDate(event.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="transaction-amount">
                            Transaction amount (ZAR)
                          </Label>
                          <Input
                            id="transaction-amount"
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={evidenceAmount}
                            onChange={(event) =>
                              setEvidenceAmount(event.target.value)
                            }
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="transaction-description">
                            Statement narrative
                          </Label>
                          <Input
                            id="transaction-description"
                            value={evidenceDescription}
                            onChange={(event) =>
                              setEvidenceDescription(event.target.value)
                            }
                            maxLength={1000}
                            placeholder="Transcribe the bank statement narrative"
                          />
                        </div>
                      </div>
                      {canCreate && (
                        <Button
                          type="button"
                          variant="outlineGold"
                          onClick={() => void addTransactionEvidence()}
                          disabled={
                            busy ||
                            !evidenceDocumentId ||
                            !statementPeriodStart ||
                            !statementPeriodEnd ||
                            !evidenceDate ||
                            !evidenceAmount ||
                            !evidenceDescription.trim()
                          }
                        >
                          {busy ? "Working…" : "Add unverified candidate"}
                        </Button>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No verified bank statements are available for this
                      application. A bank statement must first be received and
                      verified in the document workspace. Secure applicant
                      uploads remain disabled in this preview.
                    </p>
                  )}
                </div>
                {transactionEvidence.length > 0 && canEdit && (
                  <div className="space-y-1">
                    <Label htmlFor="transaction-review-note">
                      Reviewer rationale (required, at least 5 characters)
                    </Label>
                    <Textarea
                      id="transaction-review-note"
                      value={reviewerNote}
                      onChange={(event) => setReviewerNote(event.target.value)}
                      maxLength={1000}
                    />
                  </div>
                )}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">
                    Recorded transaction evidence
                  </h4>
                  {transactionEvidence.length ? (
                    transactionEvidence.map((item) => (
                      <div
                        key={item.id}
                        className="space-y-3 rounded-sm border border-border p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">
                              {item.transactionDate} ·{" "}
                              {new Intl.NumberFormat("en-ZA", {
                                style: "currency",
                                currency: "ZAR",
                              }).format(item.amountCents / 100)}
                            </p>
                            <p className="mt-1 text-sm">{item.description}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Source: {item.sourceDocumentName} ·{" "}
                              {item.sourceDocumentStatus}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Statement period:{" "}
                              {item.statementPeriodStart ?? "Not captured"} to{" "}
                              {item.statementPeriodEnd ?? "Not captured"}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Review: {item.classification.replaceAll("_", " ")}{" "}
                              · Version {item.latestReviewVersion}
                              {item.reviewedAt
                                ? ` · ${new Date(item.reviewedAt).toLocaleString()} · Reviewed by ${item.reviewedBy}`
                                : " · Awaiting reviewer verification"}
                            </p>
                          </div>
                          <span className="rounded-sm border border-border px-2 py-1 text-xs">
                            {item.sourceDocumentStatus !== "Verified"
                              ? "Source statement no longer verified"
                              : item.classification === "debit_order_reversal"
                                ? "Verified reversal"
                                : item.classification ===
                                    "not_a_debit_order_reversal"
                                  ? "Verified — not a reversal"
                                  : "Pending human review"}
                          </span>
                        </div>
                        {item.reviewerNote && (
                          <p className="text-xs text-muted-foreground">
                            Reviewer note: {item.reviewerNote}
                          </p>
                        )}
                        {canEdit &&
                          item.sourceDocumentStatus === "Verified" && (
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outlineGold"
                                onClick={() =>
                                  void reviewTransactionEvidence(
                                    item.id,
                                    "debit_order_reversal",
                                  )
                                }
                                disabled={
                                  busy || reviewerNote.trim().length < 5
                                }
                              >
                                Confirm debit-order reversal
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  void reviewTransactionEvidence(
                                    item.id,
                                    "not_a_debit_order_reversal",
                                  )
                                }
                                disabled={
                                  busy || reviewerNote.trim().length < 5
                                }
                              >
                                Not a reversal
                              </Button>
                            </div>
                          )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No transaction evidence has been recorded for this
                      application.
                    </p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  The assessment save action ignores browser-entered reversal
                  counts. It derives the count and review gate from encrypted,
                  persisted evidence and the latest append-only reviewer
                  classifications.
                </p>
              </div>
              <div className="space-y-2 border-t border-border pt-5">
                <Label htmlFor="overall-summary">
                  Overall reviewer summary
                </Label>
                <Textarea
                  id="overall-summary"
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                  maxLength={8000}
                />
                <p className="text-xs text-muted-foreground">
                  A completed worksheet is not an approval, decline,
                  pre-approval or guarantee of finance.
                </p>
              </div>
              {versions.length > 0 && (
                <div className="space-y-2 border-t border-border pt-5">
                  <h3 className="text-sm font-semibold">Assessment history</h3>
                  {versions.map((version) => (
                    <p
                      key={version.version}
                      className="text-xs text-muted-foreground"
                    >
                      Version {version.version} ·{" "}
                      {version.status.replaceAll("_", " ")} ·{" "}
                      {new Date(version.createdAt).toLocaleString()}
                    </p>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap justify-end gap-3">
                <Button
                  type="button"
                  variant="outlineGold"
                  onClick={() => setSelected(null)}
                  disabled={busy}
                >
                  Close
                </Button>
                <Button
                  type="button"
                  variant="gold"
                  onClick={save}
                  disabled={busy || !assessmentDate || !canSave}
                >
                  {busy ? "Saving…" : "Save assessment"}
                </Button>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
