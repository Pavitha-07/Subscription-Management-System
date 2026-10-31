import { useQuery } from "@tanstack/react-query";
import { api, Health } from "../api/client";

const tone: Record<string, string> = {
  ok: "bg-green-100 text-green-800",
  disabled: "bg-slate-200 text-slate-700",
  down: "bg-red-100 text-red-800",
  degraded: "bg-amber-100 text-amber-800",
};

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded border bg-white px-4 py-3">
      <span className="font-medium">{label}</span>
      <span className={`rounded px-2 py-0.5 text-sm ${tone[value] ?? tone.degraded}`}>{value}</span>
    </div>
  );
}

export default function Landing() {
  const { data, error, isLoading } = useQuery({ queryKey: ["healthz"], queryFn: () => api.get<Health>("/api/healthz") });

  return (
    <main className="mx-auto max-w-md space-y-3 p-8">
      <h1 className="text-2xl font-semibold">Brightloop</h1>
      <p className="text-slate-600">Subscription management. System status:</p>
      {isLoading && <p>Checking…</p>}
      {error && <Pill label="API" value="down" />}
      {data && (
        <>
          <Pill label="Overall" value={data.status} />
          <Pill label="App database" value={data.app_db} />
          <Pill label={`Odoo${data.odoo.version ? " " + data.odoo.version : ""}`} value={data.odoo.status} />
          {data.odoo.error && <p className="text-sm text-red-700">{data.odoo.error}</p>}
        </>
      )}
    </main>
  );
}
