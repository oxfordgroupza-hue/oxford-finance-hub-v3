import { createFileRoute } from '@tanstack/react-router'
import { InformationPage } from '@/components/site/InformationPage'

export const Route = createFileRoute('/popia')({
  head: () => ({
    links: [{ rel: 'canonical', href: 'https://finance.oxfordbusinessgroup.co.za/popia' }],
    meta: [
      { title: 'POPIA Privacy Notice | Oxford Finance Hub' },
      { name: 'description', content: 'Understand how Oxford Business Group processes personal information and how to exercise your rights under South Africa's POPIA.' },
      { property: 'og:url', content: 'https://finance.oxfordbusinessgroup.co.za/popia' },
      { name: 'robots', content: 'noindex,follow' },
    ],
  }),
  component: () => (
    <InformationPage eyebrow="Legal" title="POPIA notice" draftNotice
      intro="Information about how we process personal information in line with the Protection of Personal Information Act, 2013."
      sections={[
        { heading: 'Responsible party', body: <p>Oxford Business Group (Pty) Ltd is the responsible party for personal information processed through Oxford Finance Hub. The Information Officer’s contact details will be published here once confirmed.</p> },
        { heading: 'Purpose and minimality', body: <p>We collect only the information reasonably needed to assess and arrange finance, and use it only for that purpose and related legal obligations.</p> },
        { heading: 'Consent', body: <p>Before you submit an application, you are asked to confirm specific consents — including processing by Oxford and sharing with finance providers. We keep a record of the consents you gave and when.</p> },
        { heading: 'Data subject rights', body: <ul><li>Request access to the personal information we hold about you.</li><li>Request correction or deletion of inaccurate or outdated information.</li><li>Object to processing for direct marketing at any time.</li><li>Lodge a complaint with the Information Regulator.</li></ul> },
        { heading: 'Retention', body: <p>We retain application records only for as long as required for the purpose collected and for legal or regulatory record-keeping, after which they are securely deleted.</p> },
      ]} />
  ),
})
