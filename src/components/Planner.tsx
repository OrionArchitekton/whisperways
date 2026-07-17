"use client";

import { useState } from "react";
import CorridorMap from "./CorridorMap";
import type { Brief } from "@/lib/brief";
import type { Vertiport } from "@/lib/la";

/** /api/plan response: LaComparison with cell paths stripped. */
export interface PlanData {
  directLine: [number, number][];
  quietLine: [number, number][];
  from: Vertiport;
  to: Vertiport;
  scenario: "night" | "day";
  exposureReductionPct: number;
  addedTimePct: number;
  direct: RouteStats;
  quiet: RouteStats;
}

interface RouteStats {
  distanceM: number;
  flightTimeMin: number;
  exposureIndex: number;
  peopleAudible: number;
}

interface Props {
  vertiports: Vertiport[];
  initialSelection: { from: string; to: string; scenario: "night" | "day" };
  initialPlan: PlanData | null;
  initialBrief: Brief | null;
}

const fmtPeople = (n: number) => Math.round(n).toLocaleString("en-US");
const fmtMin = (n: number) => `${n.toFixed(1)} min`;

export default function Planner({
  vertiports,
  initialSelection,
  initialPlan,
  initialBrief,
}: Props) {
  const [fromId, setFromId] = useState(initialSelection.from);
  const [toId, setToId] = useState(initialSelection.to);
  const [scenario, setScenario] = useState<"night" | "day">(
    initialSelection.scenario,
  );
  const [plan, setPlan] = useState<PlanData | null>(initialPlan);
  const [brief, setBrief] = useState<Brief | null>(initialBrief);
  const [planning, setPlanning] = useState(false);
  const [briefing, setBriefing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runPlan() {
    setPlanning(true);
    setError(null);
    setBrief(null);
    try {
      const res = await fetch(
        `/api/plan?from=${fromId}&to=${toId}&scenario=${scenario}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "planning failed");
      setPlan(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "planning failed");
    } finally {
      setPlanning(false);
    }
  }

  async function runBrief() {
    setBriefing(true);
    setError(null);
    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ from: fromId, to: toId, scenario }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "brief failed");
      setBrief(data.brief);
    } catch (e) {
      setError(e instanceof Error ? e.message : "brief failed");
    } finally {
      setBriefing(false);
    }
  }

  const saved = plan
    ? Math.round(plan.direct.peopleAudible - plan.quiet.peopleAudible)
    : 0;
  const addedMin = plan
    ? plan.quiet.flightTimeMin - plan.direct.flightTimeMin
    : 0;

  return (
    <div className="flex h-dvh bg-slate-950 text-slate-100">
      <aside className="flex w-[26rem] shrink-0 flex-col gap-5 overflow-y-auto border-r border-slate-800 p-6">
        <header>
          <h1 className="font-display text-3xl tracking-tight">Whisperways</h1>
          <p className="mt-1 text-sm leading-snug text-slate-400">
            Pick two Los Angeles vertiports. Get the direct route, the quiet
            route, how many people hear each, and a Claude-drafted community
            impact brief grounded in the numbers.
          </p>
        </header>

        <section className="grid grid-cols-2 gap-3" data-focus="controls">
          <label className="col-span-1 text-xs text-slate-400">
            From
            <select
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100"
              value={fromId}
              onChange={(e) => setFromId(e.target.value)}
            >
              {vertiports.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </label>
          <label className="col-span-1 text-xs text-slate-400">
            To
            <select
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100"
              value={toId}
              onChange={(e) => setToId(e.target.value)}
            >
              {vertiports.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </label>
          <label className="col-span-1 text-xs text-slate-400">
            Scenario
            <select
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100"
              value={scenario}
              onChange={(e) => setScenario(e.target.value as "night" | "day")}
            >
              <option value="night">Night ops (40 dBA ambient)</option>
              <option value="day">Day ops (50 dBA ambient)</option>
            </select>
          </label>
          <button
            onClick={runPlan}
            disabled={planning || fromId === toId}
            className="col-span-1 mt-5 rounded-md bg-teal-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-teal-400 disabled:opacity-40"
          >
            {planning ? "Planning..." : "Plan corridors"}
          </button>
        </section>

        {error && (
          <p className="rounded-md border border-rose-800 bg-rose-950/60 p-3 text-sm text-rose-200">
            {error}
          </p>
        )}

        {plan && (
          <section className="space-y-3" data-focus="metrics">
            {plan.direct.peopleAudible === 0 && plan.quiet.peopleAudible === 0 ? (
              <div className="rounded-xl border border-teal-800/60 bg-teal-950/40 p-4">
                <p className="text-xs uppercase tracking-wider text-teal-300">
                  Quiet by default
                </p>
                <p className="font-display mt-1 text-2xl text-teal-200">
                  Inaudible over city ambient
                </p>
                <p className="text-sm text-slate-300">
                  In this scenario the cruising aircraft sits below the ambient
                  soundscape along both corridors, so the direct route is
                  already the quiet route.
                </p>
              </div>
            ) : (
            <div className="rounded-xl border border-teal-800/60 bg-teal-950/40 p-4">
              <p className="text-xs uppercase tracking-wider text-teal-300">
                Quiet corridor result
              </p>
              <p className="font-display mt-1 text-4xl text-teal-200">
                -{plan.exposureReductionPct.toFixed(0)}%
              </p>
              <p className="text-sm text-slate-300">
                population-weighted noise exposure, for +{fmtMin(addedMin)}
                of flight time
              </p>
            </div>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-amber-800/50 bg-slate-900 p-3">
                <p className="text-xs text-amber-300">Direct route</p>
                <p className="mt-1 text-xl font-semibold">
                  {fmtPeople(plan.direct.peopleAudible)}
                </p>
                <p className="text-xs text-slate-400">
                  people hear it · {fmtMin(plan.direct.flightTimeMin)}
                </p>
              </div>
              <div className="rounded-lg border border-teal-800/50 bg-slate-900 p-3">
                <p className="text-xs text-teal-300">Quiet corridor</p>
                <p className="mt-1 text-xl font-semibold">
                  {fmtPeople(plan.quiet.peopleAudible)}
                </p>
                <p className="text-xs text-slate-400">
                  people hear it · {fmtMin(plan.quiet.flightTimeMin)}
                </p>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-slate-500">
              {fmtPeople(saved)} fewer people under audible overflight noise.
              First-order model: published eVTOL source levels + geometric
              spreading over Census 2020 population.
            </p>
            <button
              onClick={runBrief}
              disabled={briefing}
              className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm font-medium transition hover:border-teal-500 hover:text-teal-200 disabled:opacity-40"
            >
              {briefing
                ? "Claude is drafting the brief..."
                : "Generate community impact brief"}
            </button>
          </section>
        )}

        {brief && (
          <section
            className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/80 p-4"
            data-focus="brief"
          >
            <p className="text-xs uppercase tracking-wider text-slate-400">
              Community impact brief · drafted by Claude from engine data
            </p>
            <p className="text-sm leading-relaxed text-slate-200">
              {brief.summary}
            </p>
            <div className="space-y-2">
              {brief.neighborhoods.map((n) => (
                <div key={n.name} className="rounded-md bg-slate-950/60 p-2.5">
                  <p className="text-xs font-semibold text-teal-300">{n.name}</p>
                  <p className="text-xs leading-relaxed text-slate-300">
                    {n.text}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-xs leading-relaxed text-slate-300">
              <span className="font-semibold text-amber-300">The tradeoff: </span>
              {brief.tradeoff}
            </p>
            <ul className="list-inside list-disc text-xs text-slate-400">
              {brief.commitments.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </section>
        )}

        <footer className="mt-auto pt-4 text-[11px] leading-relaxed text-slate-600">
          Data: US Census 2020 centers of population (LA County) · Joby/NASA
          2022 flyover measurements. Planning heuristic, not certification
          acoustics.
        </footer>
      </aside>

      <main className="min-w-0 flex-1">
        <CorridorMap
          directLine={plan?.directLine ?? []}
          quietLine={plan?.quietLine ?? []}
          vertiports={vertiports}
          fromId={fromId}
          toId={toId}
        />
      </main>
    </div>
  );
}
