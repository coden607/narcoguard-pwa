import type { AngelLogChart as Chart } from "@/lib/angel-log-chart"

/** A descriptive bar chart with the exact counts written beside each bar; the text is the chart. */
export function AngelLogChart({ chart }: { chart: Chart }) {
  return (
    <figure className="rounded-lg border p-3 text-sm space-y-2 break-words" data-testid="angel-log-chart">
      <figcaption>
        <span className="font-semibold">{chart.title}</span>
        <span className="block text-xs text-muted-foreground">{chart.window}. Stays on this phone; not sent to Angel.</span>
      </figcaption>
      {chart.empty ? (
        <p>{chart.text}</p>
      ) : (
        <ul className="space-y-2">
          {chart.rows.map((row) => (
            <li key={row.label}>
              <span className="flex flex-wrap justify-between gap-x-2"><span>{row.label}</span><span className="font-semibold">{row.count} of {row.of} days</span></span>
              <span className="mt-1 block h-2 rounded bg-muted" aria-hidden="true">
                <span className="block h-2 rounded bg-primary" style={{ width: `${row.of ? (row.count / row.of) * 100 : 0}%` }} />
              </span>
            </li>
          ))}
        </ul>
      )}
      {!chart.empty && <p className="text-xs text-muted-foreground">A day with nothing logged is not counted as missed.</p>}
    </figure>
  )
}
