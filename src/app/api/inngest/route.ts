import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { scrapeReddit } from "@/lib/inngest/scrape-reddit";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [scrapeReddit],
});
