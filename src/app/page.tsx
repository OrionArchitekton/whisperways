import Planner, { type PlanData } from "@/components/Planner";
import type { Brief } from "@/lib/brief";
import { VERTIPORTS } from "@/lib/la";
import demoResult from "@/data/demo-result.json";

/**
 * Server component. `?demo=1` seeds the page with the frozen-but-genuine
 * captured result (src/data/demo-result.json) so the prefilled inputs, both
 * corridors, metrics, AND the AI brief are present in the SSR HTML with no
 * client-side async wait. Provenance of the capture is disclosed in README.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const demo = params.demo === "1";

  // Shareable links: /?from=dtla&to=smo&scenario=day seeds the selection.
  const pick = (v: string | string[] | undefined) =>
    typeof v === "string" ? v : undefined;
  const ids = new Set(VERTIPORTS.map((v) => v.id));
  let from = pick(params.from) ?? "lax";
  let to = pick(params.to) ?? "bur";
  if (!ids.has(from) || !ids.has(to) || from === to) {
    from = "lax";
    to = "bur";
  }
  const scenario = pick(params.scenario) === "day" ? ("day" as const) : ("night" as const);

  const initialSelection = demo
    ? (demoResult.selection as { from: string; to: string; scenario: "night" })
    : { from, to, scenario };

  return (
    <Planner
      vertiports={VERTIPORTS}
      initialSelection={initialSelection}
      initialPlan={demo ? (demoResult.plan as unknown as PlanData) : null}
      initialBrief={demo ? (demoResult.brief as Brief) : null}
    />
  );
}
