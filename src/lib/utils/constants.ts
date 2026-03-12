export const HYDERABAD_AREAS = [
  { name: "Gachibowli", pricePerSqft: { min: 9000, max: 15000 }, growth: 27, hotness: 95, persona: "IT_PROFESSIONAL" },
  { name: "Kondapur", pricePerSqft: { min: 7000, max: 10300 }, growth: 15, hotness: 85, persona: "IT_PROFESSIONAL" },
  { name: "Kokapet", pricePerSqft: { min: 10000, max: 14000 }, growth: 37, hotness: 98, persona: "LUXURY_BUYER" },
  { name: "Narsingi", pricePerSqft: { min: 7500, max: 11000 }, growth: 4, hotness: 70, persona: "FAMILY_UPGRADER" },
  { name: "Financial District", pricePerSqft: { min: 10000, max: 14000 }, growth: 20, hotness: 90, persona: "IT_PROFESSIONAL" },
  { name: "Tellapur", pricePerSqft: { min: 5500, max: 8500 }, growth: 18, hotness: 75, persona: "FIRST_TIME_BUYER" },
  { name: "Kollur", pricePerSqft: { min: 4500, max: 7000 }, growth: 15, hotness: 65, persona: "FIRST_TIME_BUYER" },
  { name: "Shamshabad", pricePerSqft: { min: 4500, max: 6500 }, growth: 25, hotness: 80, persona: "INVESTOR" },
  { name: "Adibatla", pricePerSqft: { min: 3500, max: 5500 }, growth: 45, hotness: 85, persona: "INVESTOR" },
  { name: "Kompally", pricePerSqft: { min: 4000, max: 6000 }, growth: 12, hotness: 60, persona: "FIRST_TIME_BUYER" },
  { name: "Miyapur", pricePerSqft: { min: 5500, max: 8000 }, growth: 10, hotness: 70, persona: "FAMILY_UPGRADER" },
  { name: "Kukatpally", pricePerSqft: { min: 6000, max: 9000 }, growth: 8, hotness: 75, persona: "FAMILY_UPGRADER" },
  { name: "Manikonda", pricePerSqft: { min: 6500, max: 9500 }, growth: 12, hotness: 72, persona: "IT_PROFESSIONAL" },
  { name: "Jubilee Hills", pricePerSqft: { min: 12000, max: 25000 }, growth: 5, hotness: 60, persona: "LUXURY_BUYER" },
  { name: "Banjara Hills", pricePerSqft: { min: 12000, max: 22000 }, growth: 4, hotness: 55, persona: "LUXURY_BUYER" },
  { name: "Bachupally", pricePerSqft: { min: 4000, max: 6500 }, growth: 14, hotness: 65, persona: "FIRST_TIME_BUYER" },
  { name: "Patancheru", pricePerSqft: { min: 3500, max: 5500 }, growth: 12, hotness: 60, persona: "INVESTOR" },
  { name: "HITEC City", pricePerSqft: { min: 8000, max: 12000 }, growth: 10, hotness: 88, persona: "IT_PROFESSIONAL" },
  { name: "Madhapur", pricePerSqft: { min: 8500, max: 12500 }, growth: 12, hotness: 87, persona: "IT_PROFESSIONAL" },
  { name: "Puppalaguda", pricePerSqft: { min: 6000, max: 9000 }, growth: 15, hotness: 70, persona: "FAMILY_UPGRADER" },
];

export const BUYER_PERSONAS = {
  IT_PROFESSIONAL: { label: "IT Professional", budget: "60L - 1.5Cr", areas: ["Gachibowli", "Kondapur", "HITEC City"], color: "#3b82f6" },
  NRI: { label: "NRI Investor", budget: "1Cr - 3Cr+", areas: ["Kokapet", "Jubilee Hills", "Financial District"], color: "#8b5cf6" },
  FIRST_TIME_BUYER: { label: "First-time Buyer", budget: "40-80L", areas: ["Tellapur", "Kollur", "Kompally"], color: "#22c55e" },
  INVESTOR: { label: "Investor", budget: "20L - 2Cr", areas: ["Shamshabad", "Adibatla", "Patancheru"], color: "#f59e0b" },
  LUXURY_BUYER: { label: "Luxury Buyer", budget: "2Cr+", areas: ["Jubilee Hills", "Banjara Hills", "Kokapet"], color: "#ec4899" },
  FAMILY_UPGRADER: { label: "Family Upgrader", budget: "80L - 1.5Cr", areas: ["Narsingi", "Miyapur", "Manikonda"], color: "#14b8a6" },
};

export const SCRAPING_KEYWORDS = [
  "flat in hyderabad", "apartment hyderabad", "buy house hyderabad",
  "property hyderabad", "2BHK hyderabad", "3BHK hyderabad", "villa hyderabad",
  "plot hyderabad", "gated community hyderabad", "invest hyderabad property",
  "NRI property hyderabad", "HMDA approved", "RERA hyderabad",
  "looking for flat", "suggest apartment", "best area to buy",
];
