import { createFileRoute } from '@tanstack/react-router'
import { InformationPage } from '@/components/site/InformationPage'
import { intermediaryDisclaimer } from '@/lib/finance-config'

export const Route = createFileRoute('/terms')({
  head: () => ({ meta: [{ title: 'Terms & conditions | Oxford Finance Hub' }] }),
  component: () => (
    <InformationPage eyebrow="Legal" title="Terms & conditions" draftNotice
      intro="The terms on which Oxford Finance Hub is made available."
      sections={[
        { heading: 'Our role', body: <p>{intermediaryDisclaimer}</p> },
        { heading: 'Using this website', body: <p>You agree to provide accurate information and to use the website only for lawful purposes. You are responsible for keeping your account credentials secure.</p> },
        { heading: 'Applications', body: <p>Submitting an application does not create a credit agreement. Any finance offer is made by a finance provider on its own terms, which you should read carefully before accepting.</p> },
        { heading: 'Partner referrals', body: <p>Referral attribution is recorded when an application is started through a partner’s link or with a partner’s code, and cannot be altered by the applicant after it has been applied.</p> },
        { heading: 'Liability', body: <p>Information on this website is general and not financial advice. To the extent permitted by law, Oxford Business Group is not liable for decisions made by finance providers.</p> },
      ]} />
  ),
})
