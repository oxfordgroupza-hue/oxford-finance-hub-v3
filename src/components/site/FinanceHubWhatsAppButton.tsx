import { MessageCircle } from "lucide-react";

const WHATSAPP_NUMBER = "27639089071";
const REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function createFinanceHubEnquiryReference(date = new Date()) {
  const datePart = [
    String(date.getFullYear()).slice(-2),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");
  const randomBytes = crypto.getRandomValues(new Uint8Array(6));
  const suffix = Array.from(
    randomBytes,
    (value) => REFERENCE_ALPHABET[value % REFERENCE_ALPHABET.length],
  ).join("");

  return `OBG-${datePart}-${suffix}`;
}

function createFinanceHubEnquiryMessage(reference: string) {
  return [
    "Good day, Oxford Business Group.",
    "",
    "Enquiry type: Finance Hub Enquiry",
    `Reference: ${reference}`,
    "",
    "Please assist me with my finance enquiry.",
    "",
    "Thank you.",
  ].join("\n");
}

export function FinanceHubWhatsAppButton() {
  const openWhatsApp = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const reference = createFinanceHubEnquiryReference();
    const message = createFinanceHubEnquiryMessage(reference);
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <a
      href={`https://wa.me/${WHATSAPP_NUMBER}`}
      onClick={openWhatsApp}
      aria-label="Start a Finance Hub enquiry on WhatsApp"
      className="fixed bottom-[22px] right-[22px] z-30 inline-flex items-center gap-2 rounded-[24px] border border-[#c9a15b]/35 bg-[#101722]/95 px-4 py-2.5 text-[10px] font-semibold text-[#c9a15b] shadow-[0_5px_20px_rgba(0,0,0,0.33)] transition hover:-translate-y-0.5 hover:bg-[#172131] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a15b] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <MessageCircle aria-hidden="true" className="size-4" strokeWidth={1.8} />
      <span>WhatsApp</span>
    </a>
  );
}
