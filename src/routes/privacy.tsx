import { createFileRoute, Link } from '@tanstack/react-router'
import { InformationPage } from '@/components/site/InformationPage'

export const Route = createFileRoute('/privacy')({
  head: () => ({ meta: [{ title: 'Privacy policy | Oxford Finance Hub' }] }),
  component: () => (
    <InformationPage eyebrow="Legal" title="Privacy policy" draftNotice
      intro="How Oxford Business Group (Pty) Ltd collects, uses and protects personal information."
      sections={[
        { heading: 'Information we collect', body: <ul><li>Contact and identity details you provide in an application or enquiry.</li><li>Employment, income or business financial information relevant to a finance application.</li><li>Supporting documents, once secure document collection is enabled.</li><li>Basic technical information needed to operate and secure the website.</li></ul> },
        { heading: 'How we use it', body: <p>To assess and arrange finance on your behalf, communicate with you about your application, meet legal obligations, and improve our services. We do not sell personal information.</p> },
        { heading: 'Sharing with finance providers', body: <p>With your consent, we share your application with finance providers for assessment. Providers process your information under their own privacy policies.</p> },
        { heading: 'Storage and security', body: <p>Application records are held in a managed database and supporting documents in private storage that is not publicly accessible. Access is limited to authorised Oxford office personnel.</p> },
        { heading: 'Your rights', body: <p>You may request access to, correction of, or deletion of your personal information, subject to legal retention requirements. See our <Link to="/popia" className="text-gold underline">POPIA notice</Link> for details.</p> },
      ]} />
  ),
})
