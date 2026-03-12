const AISENSY_API = "https://backend.aisensy.com/campaign/t1/api/v2";

export async function sendWhatsAppTemplate(input: {
  phoneNumber: string;
  templateName: string;
  parameters: string[];
  mediaUrl?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const res = await fetch(AISENSY_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.AISENSY_API_KEY}`,
      },
      body: JSON.stringify({
        apiKey: process.env.AISENSY_API_KEY,
        campaignName: input.templateName,
        destination: input.phoneNumber,
        userName: "PropLeads AI",
        templateParams: input.parameters,
        ...(input.mediaUrl && { media: { url: input.mediaUrl, filename: "brochure.pdf" } }),
      }),
    });
    const data = await res.json();
    return { success: res.ok, messageId: data.messageId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
