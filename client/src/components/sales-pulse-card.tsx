import { useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatDollars, formatSignedDollars, type MoneyMonth } from "@shared/money";

export type MoneyView = {
  thisMonth: { jumpseat: number; skoolGrowth: number };
  totals: { jumpseat: number; skoolMrr: number; skoolMembers: number };
  months: MoneyMonth[];
  stripeConfigured: boolean;
};

const chartConfig = {
  jumpseat: { label: "Jumpseat", color: "#ef4444" },
  skoolGrowth: { label: "Skool MRR added", color: "#2dd4bf" },
};

export function SalesPulseCard({ money }: { money: MoneyView }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative shrink-0 overflow-hidden rounded-xl text-left outline-none ring-offset-background transition hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-red-500"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-red-600/80 via-zinc-900 to-teal-700/70" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(255,80,80,0.45),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(45,212,191,0.35),transparent_50%)]" />
        <div className="relative flex items-stretch divide-x divide-white/15 px-4 py-3 min-w-[280px]">
          <div className="pr-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-red-200">Jumpseat</p>
            <p className="text-xl font-bold tabular-nums text-white leading-tight mt-0.5">
              {formatDollars(money.thisMonth.jumpseat)}
            </p>
            <p className="text-[10px] text-white/60 mt-0.5">this month</p>
          </div>
          <div className="pl-4 pr-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-200">Skool</p>
            <p className="text-xl font-bold tabular-nums text-teal-300 leading-tight mt-0.5">
              {formatSignedDollars(money.thisMonth.skoolGrowth)} MRR
            </p>
            <p className="text-[10px] text-white/60 mt-0.5">this month</p>
          </div>
          <ChevronRight className="self-center h-4 w-4 text-white/50 group-hover:text-white ml-1" />
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl bg-zinc-950 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Monthly gains</DialogTitle>
            <DialogDescription className="text-white/55">
              Jumpseat is Stripe cash collected. Skool is new paid members × $250 MRR.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
              <p className="text-[10px] uppercase tracking-widest text-red-300">Jumpseat total</p>
              <p className="text-2xl font-bold tabular-nums mt-1">{formatDollars(money.totals.jumpseat)}</p>
              <p className="text-xs text-white/50 mt-1">
                {formatDollars(money.thisMonth.jumpseat)} this month
              </p>
            </div>
            <div className="rounded-lg border border-teal-500/30 bg-teal-500/10 p-4">
              <p className="text-[10px] uppercase tracking-widest text-teal-300">Skool MRR</p>
              <p className="text-2xl font-bold tabular-nums text-teal-300 mt-1">
                {formatDollars(money.totals.skoolMrr)}
              </p>
              <p className="text-xs text-white/50 mt-1">
                {money.totals.skoolMembers} members · {formatSignedDollars(money.thisMonth.skoolGrowth)} this month
              </p>
            </div>
          </div>

          <ChartContainer config={chartConfig} className="h-56 w-full aspect-auto">
            <ComposedChart data={money.months} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#a1a1aa", fontSize: 11 }} />
              <YAxis
                yAxisId="jumpseat"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#fca5a5", fontSize: 11 }}
                tickFormatter={(v) => `$${Math.round(v / 1000)}k`}
                width={40}
              />
              <YAxis
                yAxisId="skool"
                orientation="right"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#5eead4", fontSize: 11 }}
                tickFormatter={(v) => `$${v}`}
                width={44}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => (
                      <span className="font-mono">
                        {name === "skoolGrowth" ? formatSignedDollars(Number(value)) : formatDollars(Number(value))}
                      </span>
                    )}
                  />
                }
              />
              <Bar yAxisId="jumpseat" dataKey="jumpseat" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Line
                yAxisId="skool"
                type="monotone"
                dataKey="skoolGrowth"
                stroke="#2dd4bf"
                strokeWidth={2}
                dot={{ r: 3, fill: "#2dd4bf" }}
              />
            </ComposedChart>
          </ChartContainer>

          <div className="max-h-48 overflow-auto rounded-lg border border-white/10">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-zinc-950 text-[10px] uppercase tracking-wider text-white/45">
                <tr>
                  <th className="text-left font-medium px-3 py-2">Month</th>
                  <th className="text-right font-medium px-3 py-2 text-red-300">Jumpseat</th>
                  <th className="text-right font-medium px-3 py-2 text-teal-300">Skool MRR added</th>
                  <th className="text-right font-medium px-3 py-2">Skool MRR</th>
                </tr>
              </thead>
              <tbody>
                {[...money.months].reverse().map((row) => (
                  <tr key={row.key} className="border-t border-white/5">
                    <td className="px-3 py-2 text-white/80">{row.labelLong}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatDollars(row.jumpseat)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-teal-300">
                      {formatSignedDollars(row.skoolGrowth)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-white/60">
                      {formatDollars(row.skoolMrr)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
