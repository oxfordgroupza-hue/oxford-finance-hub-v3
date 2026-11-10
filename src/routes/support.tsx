import { createFileRoute } from '@tanstack/react-router'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { EnquiryForm } from '@/components/site/EnquiryForm'
import { InformationPage } from '@/components/site/InformationPage'

export const Route = createFileRoute('/support')({
  head: () => ({ meta: [{ title: 'Support | Oxford Finance Hub' }] }),
  component: () => (
    <InformationPage eyebrow="Support" title="How can we help?" intro="Answers to common questions, and a way to reach our support team."
      sections={[{
        heading: 'Frequently asked questions',
        body: (
          <Accordion type="single" collapsible className="not-prose">
            {faqs.map(([q, a]) => (
              <AccordionItem key={q} value={q}><AccordionTrigger className="text-left text-base">{q}</AccordionTrigger><AccordionContent className="text-muted-foreground">{a}</AccordionContent></AccordionItem>
            ))}
          </Accordion>
        ),
      }]}
      aside={<EnquiryForm kind="support" title="Contact support" extraFields={[{ id: 'reference', label: 'Application reference' }]} />} />
  ),
})

const faqs: [string, string][] = [
  ['Is Oxford Business Group a lender?', 'No. Oxford Business Group is a finance intermediary. We prepare your application and present it to finance providers, who make the credit decision.'],
  ['Can I save my application and finish later?', 'Online applications and saved drafts are temporarily paused while the secure application service is verified. When the service reopens, the portal will explain how to save and resume an application.'],
  ['How do I send supporting documents?', 'Secure document upload is temporarily unavailable. Do not email identity documents, bank statements or other sensitive records, and do not attach them to general enquiry forms. Oxford will publish secure submission instructions when document collection reopens.'],
  ['How will I know the status of my application?', 'After online applications reopen, you will be able to view available application updates in your dashboard. Email status notifications will be available once the notification service has been configured and tested.'],
  ['I was referred by a partner. Do I need their code?', 'If you used your partner’s referral link, the code is applied automatically. Otherwise, you can enter it in the Finance requirement step.'],
]
