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
        { heading: 'Finance assessments and decisions', body: <p>Oxford Finance Hub helps individuals and businesses explore finance options and coordinates the application process with relevant finance providers. The applicable provider carries out its own eligibility, affordability and credit assessments and decides whether to make an offer. The provider determines any deposit, interest rate, fees, repayment schedule, security requirements and other terms. Outcomes depend on the provider’s assessment and no particular approval, amount, rate or timeframe is guaranteed.</p> },
        { heading: 'Finance offers and agreements', body: <p>Submitting an enquiry or application does not create a credit agreement or oblige a provider to make an offer. Any offer or agreement is issued by the relevant provider. Applicants should review the provider’s full documentation, costs, obligations and terms and ask the provider questions before accepting or signing.</p> },
        { heading: 'Using this website', body: <p>You agree to provide accurate information and to use the website only for lawful purposes. You are responsible for keeping your account credentials secure.</p> },
        { heading: 'Applications', body: <p>Application information must be accurate and complete. Submitting an application does not guarantee approval or require a provider to make an offer.</p> },
        { heading: 'Partner referrals', body: <p>Referral attribution is recorded when an application is started through a partner’s link or with a partner’s code, and cannot be altered by the applicant after it has been applied.</p> },
        { heading: 'Liability', body: <p>Information on this website is general and not financial advice. To the extent permitted by law, Oxford Business Group (Pty) Ltd is not responsible for independent decisions made by finance providers.</p> },
      ]} />
  ),
})
