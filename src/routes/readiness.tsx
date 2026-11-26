import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { InformationPage } from '@/components/site/InformationPage'
import { applicantTypes, financeCategories, getDocumentChecklist } from '@/lib/finance-config'

export const Route = createFileRoute('/readiness')({
  head: () => ({ meta: [{ title: 'Application readiness | Oxford Finance Hub' }] }),
  component: () => (
    <InformationPage eyebrow="Application readiness" title="Before you apply"
      intro="What to have ready so that your application can move quickly through assessment."
      sections={[
        { heading: 'What you will need', body: <ul><li>Your contact details and, for businesses, your registration details and directors.</li><li>Income or business financial information.</li><li>A clear description of the asset or requirement, and a quotation where available.</li></ul> },
        ...(['individual', 'business'] as const).map((t) => ({
          heading: `${applicantTypes[t].label} document checklist`,
          body: (
            <div className="space-y-4">
              {financeCategories.map((c) => (
                <details key={c.id} className="rounded-sm border border-border p-4">
                  <summary className="cursor-pointer text-foreground">{c.name}</summary>
                  <ul className="mt-3">{getDocumentChecklist(t, c.id).map((d) => <li key={d.id}>{d.label}{d.required ? '' : ' (if applicable)'}</li>)}</ul>
                </details>
              ))}
            </div>
          ),
        })),
        { heading: 'About document collection', body: <p>Submit your application and supporting documents through the secure Finance Hub application process. Do not send identity documents, bank statements or other sensitive records by email or general enquiry form. The application portal provides the secure upload steps when documents are requested.</p> },
      ]}
      aside={<Button asChild variant="gold" size="xl"><Link to="/apply">Start an application</Link></Button>} />
  ),
})
