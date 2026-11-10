import { createFileRoute } from '@tanstack/react-router'
import { EnquiryForm } from '@/components/site/EnquiryForm'
import { InformationPage } from '@/components/site/InformationPage'

export const Route = createFileRoute('/complaints')({
  head: () => ({ meta: [{ title: 'Complaints | Oxford Finance Hub' }] }),
  component: () => (
    <InformationPage eyebrow="Complaints" title="Complaints process" draftNotice
      intro="We take complaints seriously and aim to resolve them fairly and promptly."
      sections={[
        { heading: 'How to complain', body: <p>Submit your complaint using the form on this page. Include your application reference, if you have one, and a clear description of the issue and the outcome you are looking for.</p> },
        { heading: 'What happens next', body: <ul><li>We acknowledge your complaint and record it with a reference.</li><li>A senior member of the office reviews it independently of the person who handled your matter.</li><li>We respond in writing with our findings and any steps we will take.</li></ul> },
        { heading: 'Complaints about a finance provider', body: <p>Credit decisions are made by finance providers. Where a complaint relates to a provider’s decision, we will help you direct it to the provider’s own complaints process.</p> },
        { heading: 'Escalation', body: <p>If you are not satisfied with our response, details of the relevant external ombud or regulator will be confirmed here before launch.</p> },
      ]}
      aside={<EnquiryForm kind="complaint" title="Submit a complaint" submitLabel="Submit complaint" extraFields={[{ id: 'reference', label: 'Application reference' }]} />} />
  ),
})
