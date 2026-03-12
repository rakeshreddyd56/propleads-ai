import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { data, error } = await getResend().emails.send({
      from: input.from ?? "PropLeads AI <leads@propleads.ai>",
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
    if (error) return { success: false, error: error.message };
    return { success: true, id: data?.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
