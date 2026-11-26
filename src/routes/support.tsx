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
  ['Can I save my application and finish later?', 'Yes. Use Save draft in the application to preserve your progress. When you are signed in, your draft is saved to your Oxford account and can be resumed from your dashboard. The browser also keeps an encrypted draft on the same device while you complete the process.'],
  ['How do I send supporting documents?', 'Upload requested documents through the secure document section of your application. Do not email identity documents, bank statements or other sensitive records, and do not attach them to general enquiry forms.'],
  ['How will I know the status of my application?', 'After you submit an application, sign in to your Oxford dashboard to view its reference, current status and available progress updates. Oxford may also contact you by email when further information is required.'],
  ['I was referred by a partner. Do I need their code?', 'If you used your partner’s referral link, the code is applied automatically. Otherwise, you can enter it in the Finance requirement step.'],
]
