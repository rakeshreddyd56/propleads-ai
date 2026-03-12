import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function claude(prompt: string, systemPrompt?: string, maxTokens = 4096) {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: maxTokens,
    system: systemPrompt ?? "You are PropLeads AI, an expert real estate analyst specializing in the Hyderabad, India market.",
    messages: [{ role: "user", content: prompt }],
  });
  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock?.text ?? "";
}

export async function claudeJSON<T>(prompt: string, systemPrompt?: string): Promise<T> {
  const text = await claude(
    prompt + "\n\nRespond with valid JSON only, no markdown fences.",
    systemPrompt
  );
  return JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim());
}

export { anthropic };
