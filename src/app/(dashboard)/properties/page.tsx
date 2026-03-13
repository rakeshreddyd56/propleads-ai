import { db } from "@/lib/db";
import { resolveOrg } from "@/lib/auth";
import { PropertyCard } from "@/components/properties/property-card";
import { UploadDialog } from "@/components/properties/upload-dialog";
import { Building2 } from "lucide-react";

export default async function PropertiesPage() {
  const orgId = await resolveOrg();
  if (!orgId) return null;

  const properties = await db.property.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { matches: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Properties</h1>
          <p className="text-sm text-zinc-500">{properties.length} properties in your portfolio</p>
        </div>
        <div data-tour="upload-property"><UploadDialog /></div>
      </div>

      {properties.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-20">
          <Building2 className="mb-4 h-12 w-12 text-zinc-300" />
          <p className="text-lg font-medium text-zinc-500">No properties yet</p>
          <p className="text-sm text-zinc-400">Upload a brochure to get started</p>
        </div>
      ) : (
        <div data-tour="property-grid" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => (
            <PropertyCard key={p.id} property={p} matchCount={p._count.matches} />
          ))}
        </div>
      )}
    </div>
  );
}
