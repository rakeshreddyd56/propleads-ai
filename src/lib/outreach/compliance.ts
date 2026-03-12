export function checkCompliance(lead: {
  optInWhatsApp: boolean;
  optInEmail: boolean;
  dndChecked: boolean;
  phone?: string | null;
  email?: string | null;
}, channel: "WHATSAPP" | "EMAIL" | "SMS"): { allowed: boolean; reason?: string } {
  if (channel === "WHATSAPP") {
    if (!lead.phone) return { allowed: false, reason: "No phone number" };
    if (!lead.optInWhatsApp) return { allowed: false, reason: "WhatsApp opt-in required (DPDP Act)" };
    return { allowed: true };
  }
  if (channel === "EMAIL") {
    if (!lead.email) return { allowed: false, reason: "No email address" };
    if (!lead.optInEmail) return { allowed: false, reason: "Email opt-in required (DPDP Act)" };
    return { allowed: true };
  }
  if (channel === "SMS") {
    if (!lead.phone) return { allowed: false, reason: "No phone number" };
    if (!lead.dndChecked) return { allowed: false, reason: "DND status not verified (TRAI)" };
    return { allowed: true };
  }
  return { allowed: false, reason: "Unknown channel" };
}
