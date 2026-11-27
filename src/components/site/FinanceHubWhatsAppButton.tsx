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

  return `OXFH-${datePart}-${suffix}`;
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
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-6 shrink-0"
        role="img"
      >
        <circle cx="12" cy="12" r="11" fill="#25D366" />
        <path
          d="M6.1 18.2 7 15.3a7.2 7.2 0 1 1 2.2 2.1l-3.1.8Z"
          fill="none"
          stroke="#fff"
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
        <path
          d="M9.1 8.4c-.2-.4-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.4-.3.3-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.8 2.9 4.4 3.9 2.2.9 2.6.7 3.1.7.5-.1 1.6-.7 1.8-1.3.2-.6.2-1.1.1-1.2-.1-.1-.3-.2-.7-.4l-1.7-.8c-.2-.1-.4-.1-.6.2l-.8 1c-.1.2-.3.2-.6.1-.3-.1-1.2-.4-2.2-1.3-.8-.7-1.3-1.6-1.5-1.9-.2-.3 0-.4.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.8-1.8Z"
          fill="#fff"
        />
      </svg>
      <span>WhatsApp</span>
    </a>
  );
}
