"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ScoreBadge } from "./score-badge";

export function LeadTable({ leads }: { leads: any[] }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Score</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Platform</TableHead>
            <TableHead>Areas</TableHead>
            <TableHead>Budget</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Match</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead.id} className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900">
              <TableCell>
                <Link href={`/leads/${lead.id}`}>
                  <ScoreBadge score={lead.score} tier={lead.tier} />
                </Link>
              </TableCell>
              <TableCell>
                <Link href={`/leads/${lead.id}`} className="font-medium hover:underline">
                  {lead.name ?? "Unknown"}
                </Link>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">{lead.platform}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {lead.preferredArea?.slice(0, 2).map((a: string) => (
                    <Badge key={a} variant="secondary" className="text-xs">{a}</Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell className="text-sm">{lead.budget ?? "—"}</TableCell>
              <TableCell className="text-sm">{lead.propertyType ?? "—"}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">{lead.status}</Badge>
              </TableCell>
              <TableCell>
                {lead.matches?.[0] ? (
                  <span className="text-xs text-green-600 font-medium">
                    {lead.matches[0].property?.name} ({lead.matches[0].matchScore}%)
                  </span>
                ) : (
                  <span className="text-xs text-zinc-400">No match</span>
                )}
              </TableCell>
            </TableRow>
          ))}
          {leads.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="py-10 text-center text-zinc-400">
                No leads found. Start scraping to discover leads.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
