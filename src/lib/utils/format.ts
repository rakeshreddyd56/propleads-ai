export function formatPrice(value: bigint | number | null): string {
  if (!value) return "N/A";
  const num = typeof value === "bigint" ? Number(value) : value;
  if (num >= 10000000) return `${(num / 10000000).toFixed(1)} Cr`;
  if (num >= 100000) return `${(num / 100000).toFixed(0)} L`;
  return `${num.toLocaleString("en-IN")}`;
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

export function platformLabel(platform: string): string {
  const labels: Record<string, string> = {
    REDDIT: "Reddit",
    FACEBOOK: "Facebook",
    TWITTER: "Twitter/X",
    INSTAGRAM: "Instagram",
    QUORA: "Quora",
    LINKEDIN: "LinkedIn",
    TELEGRAM: "Telegram",
    WHATSAPP: "WhatsApp",
    GOOGLE_MAPS: "Google Maps",
    NOBROKER: "NoBroker",
    NINETY_NINE_ACRES: "99acres",
    MAGICBRICKS: "MagicBricks",
    COMMONFLOOR: "CommonFloor",
    YOUTUBE: "YouTube",
    MANUAL: "Manual",
    WEBSITE: "Website",
  };
  return labels[platform] ?? platform;
}
