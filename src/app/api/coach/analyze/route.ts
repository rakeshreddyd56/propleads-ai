import { NextRequest, NextResponse } from "next/server";
import { resolveAuth } from "@/lib/auth";
import { analyzeConversation } from "@/lib/ai/conversation-coach";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await resolveAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { orgId, userId } = session;

  const body = await req.json();
  const { conversation, leadId } = body;

  if (!conversation || typeof conversation !== "string") {
    return NextResponse.json({ error: "conversation text is required" }, { status: 400 });
  }

  if (leadId && typeof leadId !== "string") {
    return NextResponse.json({ error: "leadId must be a string" }, { status: 400 });
  }

  // Fetch lead data for context if leadId provided
  let leadContext: Parameters<typeof analyzeConversation>[1] = undefined;
  if (leadId) {
    const lead = await db.lead.findFirst({ where: { id: leadId, orgId } });
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    // Fetch broker's properties for context
    const properties = await db.property.findMany({
      where: { orgId, status: "ACTIVE" },
      select: { name: true, area: true, priceMin: true, priceMax: true, unitTypes: true, amenities: true, usps: true, reraNumber: true },
      take: 10,
    });

    leadContext = {
      lead: {
        name: lead.name,
        score: lead.score,
        tier: lead.tier,
        budget: lead.budget,
        budgetMin: lead.budgetMin ? Number(lead.budgetMin) : null,
        budgetMax: lead.budgetMax ? Number(lead.budgetMax) : null,
        preferredArea: lead.preferredArea,
        buyerPersona: lead.buyerPersona,
        timeline: lead.timeline,
        intentSignals: lead.intentSignals,
        propertyType: lead.propertyType,
      },
      properties: properties.map((p) => ({
        name: p.name,
        area: p.area,
        priceRange: `${p.priceMin ? (Number(p.priceMin) / 100000).toFixed(0) + "L" : "?"} - ${p.priceMax ? (Number(p.priceMax) / 100000).toFixed(0) + "L" : "?"}`,
        unitTypes: p.unitTypes,
        amenities: p.amenities,
        usps: p.usps,
        reraNumber: p.reraNumber,
      })),
    };
  } else {
    // Even without a lead, include properties for context
    const properties = await db.property.findMany({
      where: { orgId, status: "ACTIVE" },
      select: { name: true, area: true, priceMin: true, priceMax: true, unitTypes: true, amenities: true, usps: true, reraNumber: true },
      take: 10,
    });
    if (properties.length > 0) {
      leadContext = {
        properties: properties.map((p) => ({
          name: p.name,
          area: p.area,
          priceRange: `${p.priceMin ? (Number(p.priceMin) / 100000).toFixed(0) + "L" : "?"} - ${p.priceMax ? (Number(p.priceMax) / 100000).toFixed(0) + "L" : "?"}`,
          unitTypes: p.unitTypes,
          amenities: p.amenities,
          usps: p.usps,
          reraNumber: p.reraNumber,
        })),
      };
    }
  }

  const analysis = await analyzeConversation(conversation, leadContext);

  await db.coachSession.create({
    data: {
      userId,
      leadId: leadId ?? null,
      type: "CONVERSATION_ANALYSIS",
      input: conversation,
      response: { analysis },
    },
  });

  return NextResponse.json({ analysis });
}
