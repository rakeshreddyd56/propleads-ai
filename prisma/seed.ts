import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create default organization
  const org = await prisma.organization.upsert({
    where: { slug: "propleads-demo" },
    update: {},
    create: {
      name: "PropLeads Demo",
      slug: "propleads-demo",
    },
  });

  console.log(`Organization: ${org.name} (${org.id})`);

  // Seed scraping sources
  const sources = [
    { platform: "REDDIT" as const, identifier: "hyderabad", displayName: "r/hyderabad", keywords: ["flat", "apartment", "property", "2BHK", "3BHK", "buy house", "real estate", "gated community"] },
    { platform: "REDDIT" as const, identifier: "IndianRealEstate", displayName: "r/IndianRealEstate", keywords: ["hyderabad", "gachibowli", "kokapet", "kondapur", "HITEC City", "financial district"] },
    { platform: "REDDIT" as const, identifier: "IndiaInvestments", displayName: "r/IndiaInvestments", keywords: ["hyderabad property", "real estate investment", "apartment hyderabad"] },
    { platform: "REDDIT" as const, identifier: "NRI", displayName: "r/NRI", keywords: ["property hyderabad", "invest hyderabad", "NRI flat", "home india"] },
    { platform: "REDDIT" as const, identifier: "india", displayName: "r/india", keywords: ["hyderabad flat", "buy apartment hyderabad", "property advice hyderabad"] },
    { platform: "FACEBOOK" as const, identifier: "hyderabadnrirealestateinvestors", displayName: "Hyderabad NRI RE Investors", keywords: ["property", "flat", "investment", "NRI"] },
    { platform: "FACEBOOK" as const, identifier: "847608352671871", displayName: "KONDAPUR RE GROUP", keywords: ["flat", "apartment", "2BHK", "3BHK", "rent", "buy"] },
    { platform: "NINETY_NINE_ACRES" as const, identifier: "Hyderabad-Real-Estate", displayName: "99acres Hyderabad", keywords: ["hyderabad", "gachibowli", "kokapet", "kondapur"] },
    { platform: "MAGICBRICKS" as const, identifier: "hyderabad", displayName: "MagicBricks Hyderabad", keywords: ["apartment", "villa", "plot"] },
    { platform: "NOBROKER" as const, identifier: "forum", displayName: "NoBroker Forum", keywords: ["hyderabad", "property", "flat"] },
    { platform: "COMMONFLOOR" as const, identifier: "c5-hyderabad", displayName: "CommonFloor Hyderabad", keywords: ["hyderabad", "apartment"] },
    { platform: "GOOGLE_MAPS" as const, identifier: "real+estate+agents+hyderabad", displayName: "Google Maps RE Agents", keywords: ["real estate", "builder", "property dealer"] },
  ];

  for (const source of sources) {
    await prisma.scrapingSource.upsert({
      where: {
        orgId_platform_identifier: {
          orgId: org.id,
          platform: source.platform,
          identifier: source.identifier,
        },
      },
      update: {},
      create: { orgId: org.id, ...source },
    });
  }
  console.log(`Seeded ${sources.length} scraping sources`);

  // Seed message templates
  const templates = [
    {
      name: "First Contact — IT Professional",
      channel: "WHATSAPP" as const,
      category: "FIRST_CONTACT" as const,
      body: "Hi {{name}}! I noticed you were exploring properties near {{area}}. We have some excellent options at {{property}} with great connectivity to IT parks. Would you like me to share the brochure? The project is RERA approved and Vastu compliant.",
      variables: ["name", "area", "property"],
    },
    {
      name: "First Contact — NRI",
      channel: "WHATSAPP" as const,
      category: "NRI_SPECIFIC" as const,
      body: "Hello {{name}}, Namaste! I understand you're looking at Hyderabad real estate from abroad. {{property}} in {{area}} offers excellent rental yields (3-4%) and we provide complete NRI support — virtual tours, POA assistance, and dedicated relationship management. Shall I set up a virtual walkthrough?",
      variables: ["name", "property", "area"],
    },
    {
      name: "First Contact — First-Time Buyer",
      channel: "WHATSAPP" as const,
      category: "FIRST_CONTACT" as const,
      body: "Hi {{name}}! Congratulations on starting your home-buying journey! I saw you were looking at properties in {{area}}. {{property}} is a great fit for first-time buyers — RERA registered, bank-approved loans available, and prices starting from {{price}}. Happy to help you understand the process!",
      variables: ["name", "area", "property", "price"],
    },
    {
      name: "Brochure Share",
      channel: "WHATSAPP" as const,
      category: "BROCHURE_SHARE" as const,
      body: "Hi {{name}}, here's the brochure for {{property}} in {{area}} as promised. Key highlights: {{usps}}. Would you like to schedule a site visit this weekend?",
      variables: ["name", "property", "area", "usps"],
    },
    {
      name: "Site Visit Invite",
      channel: "WHATSAPP" as const,
      category: "SITE_VISIT" as const,
      body: "Hi {{name}}, we're organizing exclusive site visits to {{property}} this {{day}}. We'll arrange pickup from {{area}} and you'll get to see the model flat, amenities, and construction progress. Shall I book a slot for you?",
      variables: ["name", "property", "day", "area"],
    },
    {
      name: "Follow-up — After Interest",
      channel: "WHATSAPP" as const,
      category: "FOLLOW_UP" as const,
      body: "Hi {{name}}, just checking in! Were you able to review the {{property}} brochure? I'm available to answer any questions about pricing, payment plans, or the area. Many units in your preferred configuration are selling fast!",
      variables: ["name", "property"],
    },
    {
      name: "Welcome Email",
      channel: "EMAIL" as const,
      category: "FIRST_CONTACT" as const,
      subject: "Welcome to {{property}} — Your Dream Home in {{area}}",
      body: "<h2>Hello {{name}},</h2><p>Thank you for your interest in {{property}}, located in {{area}}, Hyderabad.</p><p>Here's what makes it special:</p><ul><li>RERA Approved: {{rera}}</li><li>Vastu Compliant Design</li><li>Starting from ₹{{price}}</li></ul><p>I'd love to help you find the perfect unit. Would you be available for a call this week?</p><p>Best regards,<br/>PropLeads AI Team</p>",
      variables: ["name", "property", "area", "rera", "price"],
    },
    {
      name: "Market Update — Price Appreciation",
      channel: "EMAIL" as const,
      category: "MARKET_UPDATE" as const,
      subject: "Hyderabad Real Estate Update: {{area}} Prices Up {{growth}}%",
      body: "<h2>{{area}} Market Update</h2><p>Hi {{name}},</p><p>Property prices in {{area}} have appreciated by {{growth}}% in the last year, making it one of the hottest micro-markets in Hyderabad.</p><p>Current price range: ₹{{priceRange}} per sqft</p><p>If you've been considering a purchase, now might be the right time. Let me know if you'd like to explore options.</p>",
      variables: ["name", "area", "growth", "priceRange"],
    },
  ];

  for (const template of templates) {
    await prisma.messageTemplate.create({
      data: { orgId: org.id, ...template },
    });
  }
  console.log(`Seeded ${templates.length} message templates`);

  // Seed a sample campaign
  await prisma.campaign.create({
    data: {
      orgId: org.id,
      name: "7-Day Follow-up Sequence",
      status: "DRAFT",
      targetTier: "HOT",
      steps: [
        { day: 0, action: "WhatsApp: First Contact", channel: "WHATSAPP", category: "FIRST_CONTACT" },
        { day: 1, action: "Email: Welcome + Brochure", channel: "EMAIL", category: "BROCHURE_SHARE" },
        { day: 3, action: "WhatsApp: Follow-up", channel: "WHATSAPP", category: "FOLLOW_UP" },
        { day: 5, action: "WhatsApp: Site Visit Invite", channel: "WHATSAPP", category: "SITE_VISIT" },
        { day: 7, action: "Email: Market Update", channel: "EMAIL", category: "MARKET_UPDATE" },
      ],
    },
  });
  console.log("Seeded 1 campaign");

  // Seed sample properties
  const sampleProperties = [
    {
      name: "My Home Vihanga",
      builderName: "My Home Constructions",
      reraNumber: "P02400003364",
      location: "Survey No 78, Gachibowli, Hyderabad",
      area: "Gachibowli",
      propertyType: "APARTMENT" as const,
      unitTypes: [
        { type: "2BHK", sizeSqft: 1245, priceINR: 9500000 },
        { type: "3BHK", sizeSqft: 1750, priceINR: 13200000 },
        { type: "3BHK Premium", sizeSqft: 2100, priceINR: 16800000 },
      ],
      amenities: ["Swimming Pool", "Gym", "Clubhouse", "Children's Play Area", "Jogging Track", "Indoor Games", "24/7 Security"],
      usps: ["Vastu Compliant", "5 min from IT Hub", "RERA Approved", "40+ acres township", "Pre-certified Green Building"],
      priceMin: BigInt(9500000),
      priceMax: BigInt(16800000),
    },
    {
      name: "Rajapushpa Provincia",
      builderName: "Rajapushpa Properties",
      reraNumber: "P02400004521",
      location: "Kokapet, Hyderabad",
      area: "Kokapet",
      propertyType: "VILLA" as const,
      unitTypes: [
        { type: "3BHK Villa", sizeSqft: 2800, priceINR: 28000000 },
        { type: "4BHK Villa", sizeSqft: 3500, priceINR: 37000000 },
      ],
      amenities: ["Private Garden", "Swimming Pool", "Clubhouse", "Tennis Court", "Spa", "Business Center", "Helipad"],
      usps: ["Luxury Gated Villa Community", "Near Financial District", "Premium Finishes", "Smart Home Features", "HMDA Approved"],
      priceMin: BigInt(28000000),
      priceMax: BigInt(37000000),
    },
    {
      name: "Prestige High Fields",
      builderName: "Prestige Group",
      reraNumber: "P02400005678",
      location: "Financial District, Nanakramguda, Hyderabad",
      area: "Financial District",
      propertyType: "APARTMENT" as const,
      unitTypes: [
        { type: "2BHK", sizeSqft: 1350, priceINR: 12500000 },
        { type: "3BHK", sizeSqft: 1900, priceINR: 18000000 },
        { type: "4BHK", sizeSqft: 2600, priceINR: 26000000 },
      ],
      amenities: ["Infinity Pool", "Sky Lounge", "Gym", "Co-working Space", "Mini Theatre", "Organic Garden"],
      usps: ["Walking distance to IT companies", "Metro connectivity planned", "Prestige brand trust", "NRI investment friendly", "Vastu compliant"],
      priceMin: BigInt(12500000),
      priceMax: BigInt(26000000),
    },
  ];

  for (const prop of sampleProperties) {
    await prisma.property.create({
      data: { orgId: org.id, ...prop },
    });
  }
  console.log(`Seeded ${sampleProperties.length} sample properties`);

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
