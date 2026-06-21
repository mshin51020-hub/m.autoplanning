import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Scale, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

function localDateJST(): string {
  const d = new Date();
  const offset = 9 * 60;
  const jst = new Date(d.getTime() + (offset - d.getTimezoneOffset()) * 60000);
  return jst.toISOString().slice(0, 10);
}

const TOOLTIP_STYLE = {
  contentStyle: { background: "#111827", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 },
  labelStyle:   { color: "#f1f5f9" },
  itemStyle:    { fontSize: 12 },
};

function MeasurementForm({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen]       = useState(false);
  const [weight, setWeight]   = useState("");
  const [bodyFat, setBodyFat] = useState("");

  const upsert = trpc.body.upsert.useMutation({
    onSuccess: () => {
      toast.success("記録しました");
      setOpen(false);
      setWeight("");
      setBodyFat("");
      onSaved();
    },
    onError: () => toast.error("保存に失敗しました"),
  });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary text-xs transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        今日の体重・体脂肪を記録
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card/50 p-4 space-y-3">
      <div className="text-xs font-medium text-foreground">今日の記録 — {localDateJST()}</div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-muted-foreground">体重 (kg)</label>
          <input
            type="number"
            min="20"
            max="200"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="65.0"
            className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">体脂肪率 (%)</label>
          <input
            type="number"
            min="3"
            max="60"
            step="0.1"
            value={bodyFat}
            onChange={(e) => setBodyFat(e.target.value)}
            placeholder="18.0"
            className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1"
          disabled={(!weight && !bodyFat) || upsert.isPending}
          onClick={() =>
            upsert.mutate({
              measuredDate: localDateJST(),
              weight:  weight  ? parseFloat(weight)  : undefined,
              bodyFat: bodyFat ? parseFloat(bodyFat) : undefined,
            })
          }
        >
          {upsert.isPending ? "保存中…" : "保存"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
          キャンセル
        </Button>
      </div>
    </div>
  );
}

export default function BodyMeasurementSection() {
  const { isAuthenticated } = useAuth();
  const [days, setDays] = useState<90 | 180 | 365>(90);

  const { data: history, refetch } = trpc.body.getHistory.useQuery(
    { days },
    { enabled: isAuthenticated }
  );

  if (!isAuthenticated) return null;

  const hasData = (history?.length ?? 0) > 0;
  const hasWeight  = history?.some((r) => r.weight  != null) ?? false;
  const hasBodyFat = history?.some((r) => r.bodyFat != null) ?? false;

  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold">体重・体脂肪の推移</h2>
        </div>
        <div className="flex gap-1">
          {([90, 180, 365] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`px-2 py-0.5 text-xs rounded border font-mono transition-colors ${
                days === d
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {d === 90 ? "3M" : d === 180 ? "6M" : "1Y"}
            </button>
          ))}
        </div>
      </div>

      <MeasurementForm onSaved={() => refetch()} />

      {hasData ? (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart
            data={history!.map((r) => ({
              date:    r.measuredDate,
              weight:  r.weight  != null ? Number(r.weight)  : undefined,
              bodyFat: r.bodyFat != null ? Number(r.bodyFat) : undefined,
            }))}
            margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#64748b" }}
              tickFormatter={(v) => v.slice(5)}
            />
            {hasWeight && (
              <YAxis
                yAxisId="weight"
                orientation="left"
                tick={{ fontSize: 10, fill: "#64748b" }}
                unit="kg"
                domain={["auto", "auto"]}
              />
            )}
            {hasBodyFat && (
              <YAxis
                yAxisId="fat"
                orientation="right"
                tick={{ fontSize: 10, fill: "#64748b" }}
                unit="%"
                domain={["auto", "auto"]}
              />
            )}
            <Tooltip {...TOOLTIP_STYLE} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
            {hasWeight && (
              <Line
                yAxisId="weight"
                type="monotone"
                dataKey="weight"
                name="体重 (kg)"
                stroke="#f97316"
                strokeWidth={2}
                dot={{ r: 3, fill: "#f97316" }}
                connectNulls
              />
            )}
            {hasBodyFat && (
              <Line
                yAxisId="fat"
                type="monotone"
                dataKey="bodyFat"
                name="体脂肪率 (%)"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={{ r: 3, fill: "#38bdf8" }}
                connectNulls
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-xs text-muted-foreground py-4 text-center">
          まだ記録がありません。毎日記録して変化を確認しましょう。
        </p>
      )}
    </section>
  );
}
