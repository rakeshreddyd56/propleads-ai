import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function claude(
  prompt: string,
  systemPrompt?: string,
  maxTokens = 4096,
  model: "sonnet" | "haiku" = "sonnet"
) {
  const modelId = model === "haiku" ? "claude-haiku-4-5-20251001" : "claude-sonnet-4-20250514";
  const response = await anthropic.messages.create({
    model: modelId,
    max_tokens: maxTokens,
    system: systemPrompt ?? "You are PropLeads AI, an expert real estate analyst specializing in the Hyderabad, India market.",
    messages: [{ role: "user", content: prompt }],
  });
  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock?.text ?? "";
}

export async function claudeJSON<T>(
  prompt: string,
  systemPrompt?: string,
  model: "sonnet" | "haiku" = "sonnet"
): Promise<T> {
  const text = await claude(
    prompt + "\n\nRespond with valid JSON only, no markdown fences.",
    systemPrompt,
    4096,
    model
  );
  return JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim());
}

/** Fast version using Haiku for bulk operations */
export async function claudeJSONFast<T>(prompt: string, systemPrompt?: string): Promise<T> {
  return claudeJSON<T>(prompt, systemPrompt, "haiku");
}

export { anthropic };
