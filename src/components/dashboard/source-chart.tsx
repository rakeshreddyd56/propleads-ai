"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from "recharts";

interface SourceData {
  platform: string;
  count: number;
}

export function SourceChart({ data }: { data: SourceData[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Leads by Source</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-zinc-400">No data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <XAxis dataKey="platform" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} interval={0} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#60a5fa" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="count" position="top" className="text-xs fill-zinc-500" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
