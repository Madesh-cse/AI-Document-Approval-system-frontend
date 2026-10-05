"use client";

import {
  ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

/* -------------------------------------------------------------------------- */
/* Types and constants                                                        */
/* -------------------------------------------------------------------------- */

interface ChartDocument {
  status: string;
  created_at: string;
}

interface DashboardChartsProps {
  documents: ChartDocument[];
  isReviewer: boolean;
}

type StatusKey = "approved" | "pending" | "rejected" | "other";
type Counts = Record<StatusKey, number> & { total: number };

const STATUS_ORDER: StatusKey[] = ["approved", "pending", "rejected", "other"];

const STATUS_META: Record<StatusKey, { label: string; color: string }> = {
  approved: { label: "Approved", color: "#10B981" },
  pending: { label: "Pending review", color: "#F59E0B" },
  rejected: { label: "Rejected", color: "#EF4444" },
  other: { label: "Other", color: "#94A3B8" },
};

const BRAND_COLOR = "#2563EB";

const RANGES = [
  { id: "7d", label: "7D", days: 7, step: 1, text: "the last 7 days" },
  { id: "30d", label: "30D", days: 30, step: 1, text: "the last 30 days" },
  { id: "90d", label: "90D", days: 90, step: 7, text: "the last 90 days" },
] as const;

type Range = (typeof RANGES)[number];

const AGING_BUCKETS = [
  { label: "0-2 days", min: 0, max: 2, color: "#FBBF24" },
  { label: "3-7 days", min: 3, max: 7, color: "#F59E0B" },
  { label: "8-14 days", min: 8, max: 14, color: "#F97316" },
  { label: "15+ days", min: 15, max: Infinity, color: "#EF4444" },
];

const DAY_MS = 86_400_000;

/* -------------------------------------------------------------------------- */
/* Data helpers                                                               */
/* -------------------------------------------------------------------------- */

function normalizeStatus(status: string): StatusKey {
  switch (status?.toLowerCase()) {
    case "approved":
      return "approved";
    case "rejected":
      return "rejected";
    case "pending_review":
    case "pending":
      return "pending";
    default:
      return "other";
  }
}

function emptyCounts(): Counts {
  return { approved: 0, pending: 0, rejected: 0, other: 0, total: 0 };
}

function countDocuments(documents: ChartDocument[]): Counts {
  const counts = emptyCounts();

  for (const document of documents) {
    counts[normalizeStatus(document.status)] += 1;
    counts.total += 1;
  }

  return counts;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function formatDay(time: number) {
  return new Date(time).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

interface Bucket {
  label: string;
  fullLabel: string;
  start: number;
  end: number;
}

function buildBuckets(range: Range): Bucket[] {
  const tomorrow = startOfToday() + DAY_MS;
  const count = Math.ceil(range.days / range.step);

  return Array.from({ length: count }, (_, index) => {
    const offset = count - 1 - index;
    const end = tomorrow - offset * range.step * DAY_MS;
    const start = end - range.step * DAY_MS;

    return {
      label: formatDay(start),
      fullLabel:
        range.step === 1
          ? formatDay(start)
          : `${formatDay(start)} - ${formatDay(end - DAY_MS)}`,
      start,
      end,
    };
  });
}

function bucketCounts(documents: ChartDocument[], buckets: Bucket[]) {
  const result = buckets.map(() => emptyCounts());

  for (const document of documents) {
    const time = new Date(document.created_at).getTime();

    if (Number.isNaN(time)) continue;

    const index = buckets.findIndex(
      (bucket) => time >= bucket.start && time < bucket.end,
    );

    if (index === -1) continue;

    result[index][normalizeStatus(document.status)] += 1;
    result[index].total += 1;
  }

  return result;
}

function periodChange(documents: ChartDocument[], buckets: Bucket[]) {
  const first = buckets[0].start;
  const last = buckets[buckets.length - 1].end;
  const length = last - first;

  let current = 0;
  let previous = 0;

  for (const document of documents) {
    const time = new Date(document.created_at).getTime();

    if (Number.isNaN(time)) continue;

    if (time >= first && time < last) current += 1;
    else if (time >= first - length && time < first) previous += 1;
  }

  return previous > 0 ? ((current - previous) / previous) * 100 : null;
}

function pendingAges(documents: ChartDocument[]) {
  const now = Date.now();

  return documents
    .filter((document) => normalizeStatus(document.status) === "pending")
    .map((document) =>
      Math.max(
        0,
        Math.floor((now - new Date(document.created_at).getTime()) / DAY_MS),
      ),
    )
    .filter((age) => Number.isFinite(age));
}

function niceScale(max: number) {
  if (max <= 0) {
    return { max: 4, ticks: [0, 1, 2, 3, 4] };
  }

  const rough = max / 4;
  const power = Math.pow(10, Math.floor(Math.log10(rough)));
  const fraction = rough / power;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  const step = Math.max(1, nice * power);
  const top = Math.ceil(max / step) * step;

  const ticks: number[] = [];

  for (let value = 0; value <= top; value += step) {
    ticks.push(value);
  }

  return { max: top, ticks };
}

const PERCENT_SCALE = { max: 100, ticks: [0, 25, 50, 75, 100] };

function toSegments(values: (number | null)[]) {
  const segments: { index: number; value: number }[][] = [];
  let current: { index: number; value: number }[] = [];

  values.forEach((value, index) => {
    if (value === null) {
      if (current.length) {
        segments.push(current);
        current = [];
      }
    } else {
      current.push({ index, value });
    }
  });

  if (current.length) segments.push(current);

  return segments;
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/* -------------------------------------------------------------------------- */
/* Layout pieces                                                              */
/* -------------------------------------------------------------------------- */

function ChartCard({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      <div className="border-b border-slate-100 px-6 py-4">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>

        {description && (
          <p className="mt-0.5 text-xs text-slate-400">{description}</p>
        )}
      </div>

      <div className="p-6">{children}</div>
    </section>
  );
}

function RangeToggle({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div
      className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5"
      role="group"
      aria-label="Time range"
    >
      {RANGES.map((range) => (
        <button
          key={range.id}
          type="button"
          onClick={() => onChange(range.id)}
          aria-pressed={value === range.id}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            value === range.id
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}

function DeltaChip({ change }: { change: number | null }) {
  if (change === null) return null;

  const rounded = Math.round(change);
  const arrow = rounded > 0 ? "▲" : rounded < 0 ? "▼" : "•";

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
      <span className="text-[9px]">{arrow}</span>
      {Math.abs(rounded)}% vs previous period
    </span>
  );
}

function Metric({
  value,
  label,
  change,
}: {
  value: string | number;
  label: string;
  change?: number | null;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="text-3xl font-semibold text-slate-900">{value}</span>
      <span className="text-sm text-slate-500">{label}</span>
      {change !== undefined && <DeltaChip change={change} />}
    </div>
  );
}

function Legend({ keys }: { keys: StatusKey[] }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {keys.map((key) => (
        <span
          key={key}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500"
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: STATUS_META[key].color }}
          />
          {STATUS_META[key].label}
        </span>
      ))}
    </div>
  );
}

function TooltipBody({
  title,
  rows,
  footer,
}: {
  title: string;
  rows: { label: string; color: string; value: string }[];
  footer?: { label: string; value: string };
}) {
  return (
    <>
      <p className="mb-1.5 font-semibold text-slate-900">{title}</p>

      <div className="space-y-1">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-4"
          >
            <span className="inline-flex items-center gap-1.5 text-slate-500">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: row.color }}
              />
              {row.label}
            </span>

            <span className="font-medium text-slate-900">{row.value}</span>
          </div>
        ))}
      </div>

      {footer && (
        <div className="mt-1.5 flex items-center justify-between gap-4 border-t border-slate-100 pt-1.5">
          <span className="text-slate-500">{footer.label}</span>
          <span className="font-semibold text-slate-900">{footer.value}</span>
        </div>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Chart frame (axes, grid, hover, tooltip)                                   */
/* -------------------------------------------------------------------------- */

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;

    if (!element) return;

    setWidth(Math.floor(element.getBoundingClientRect().width));

    const observer = new ResizeObserver((entries) => {
      setWidth(Math.floor(entries[0].contentRect.width));
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}

const MARGIN = { top: 12, right: 12, bottom: 28, left: 36 };

interface FrameApi {
  xAt: (index: number) => number;
  yAt: (value: number) => number;
  innerWidth: number;
  innerHeight: number;
  bandWidth: number;
  hover: number | null;
}

function ChartFrame({
  labels,
  scale,
  mode,
  height = 240,
  ariaLabel,
  formatTick = String,
  renderPlot,
  renderTooltip,
}: {
  labels: string[];
  scale: { max: number; ticks: number[] };
  mode: "point" | "band";
  height?: number;
  ariaLabel: string;
  formatTick?: (value: number) => string;
  renderPlot: (api: FrameApi) => ReactNode;
  renderTooltip: (index: number) => ReactNode;
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const count = labels.length;
  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerHeight = height - MARGIN.top - MARGIN.bottom;
  const bandWidth = count > 0 ? innerWidth / count : 0;

  const xAt = (index: number) =>
    mode === "band"
      ? MARGIN.left + bandWidth * (index + 0.5)
      : MARGIN.left +
        (count > 1 ? (innerWidth * index) / (count - 1) : innerWidth / 2);

  const yAt = (value: number) =>
    MARGIN.top + innerHeight * (1 - value / scale.max);

  const maxLabels = Math.max(2, Math.floor(innerWidth / 58));
  const every = Math.max(1, Math.ceil(count / maxLabels));

  const handlePointerMove = (event: ReactPointerEvent<SVGRectElement>) => {
    if (count === 0) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;

    const index =
      mode === "band"
        ? Math.floor(x / bandWidth)
        : count > 1
          ? Math.round(x / (innerWidth / (count - 1)))
          : 0;

    setHover(Math.min(count - 1, Math.max(0, index)));
  };

  const hoverX = hover !== null ? xAt(hover) : 0;
  const tooltipOnRight = hoverX < width / 2;

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel}>
          {scale.ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={MARGIN.left}
                x2={width - MARGIN.right}
                y1={yAt(tick)}
                y2={yAt(tick)}
                stroke="#E2E8F0"
                strokeDasharray={tick === 0 ? undefined : "3 4"}
              />

              <text
                x={MARGIN.left - 8}
                y={yAt(tick)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize="11"
                fill="#94A3B8"
              >
                {formatTick(tick)}
              </text>
            </g>
          ))}

          {hover !== null && mode === "band" && (
            <rect
              x={MARGIN.left + bandWidth * hover}
              y={MARGIN.top}
              width={bandWidth}
              height={innerHeight}
              fill="#F8FAFC"
            />
          )}

          {hover !== null && mode === "point" && (
            <line
              x1={hoverX}
              x2={hoverX}
              y1={MARGIN.top}
              y2={MARGIN.top + innerHeight}
              stroke="#CBD5E1"
              strokeDasharray="3 3"
            />
          )}

          {renderPlot({
            xAt,
            yAt,
            innerWidth,
            innerHeight,
            bandWidth,
            hover,
          })}

          {labels.map(
            (label, index) =>
              (count - 1 - index) % every === 0 && (
                <text
                  key={`${label}-${index}`}
                  x={xAt(index)}
                  y={height - 8}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#94A3B8"
                >
                  {label}
                </text>
              ),
          )}

          <rect
            x={MARGIN.left}
            y={MARGIN.top}
            width={innerWidth}
            height={innerHeight}
            fill="transparent"
            style={{ touchAction: "pan-y" }}
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setHover(null)}
          />
        </svg>
      )}

      {hover !== null && width > 0 && (
        <div
          className="pointer-events-none absolute z-10 min-w-40 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"
          style={
            tooltipOnRight
              ? { left: hoverX + 14, top: MARGIN.top }
              : { right: width - hoverX + 14, top: MARGIN.top }
          }
        >
          {renderTooltip(hover)}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Trend (area / line) chart                                                  */
/* -------------------------------------------------------------------------- */

interface Series {
  key: string;
  label: string;
  color: string;
  values: (number | null)[];
  area?: boolean;
}

function TrendChart({
  buckets,
  series,
  scale,
  ariaLabel,
  formatTick,
  formatValue = (value) => String(value),
}: {
  buckets: Bucket[];
  series: Series[];
  scale: { max: number; ticks: number[] };
  ariaLabel: string;
  formatTick?: (value: number) => string;
  formatValue?: (value: number) => string;
}) {
  const gradientId = useId().replace(/:/g, "");

  return (
    <ChartFrame
      mode="point"
      labels={buckets.map((bucket) => bucket.label)}
      scale={scale}
      ariaLabel={ariaLabel}
      formatTick={formatTick}
      renderPlot={({ xAt, yAt, hover }) => (
        <>
          <defs>
            {series.map((item) => (
              <linearGradient
                key={item.key}
                id={`${gradientId}-${item.key}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={item.color} stopOpacity="0.22" />
                <stop offset="100%" stopColor={item.color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>

          {series.map((item) =>
            toSegments(item.values).map((segment, segmentIndex) => {
              const points = segment.map(
                (point) => `${xAt(point.index)},${yAt(point.value)}`,
              );
              const line = `M ${points.join(" L ")}`;
              const baseline = yAt(0);
              const area = `${line} L ${xAt(
                segment[segment.length - 1].index,
              )},${baseline} L ${xAt(segment[0].index)},${baseline} Z`;

              return (
                <g key={`${item.key}-${segmentIndex}`}>
                  {item.area && segment.length > 1 && (
                    <path
                      d={area}
                      fill={`url(#${gradientId}-${item.key})`}
                    />
                  )}

                  {segment.length > 1 ? (
                    <path
                      d={line}
                      fill="none"
                      stroke={item.color}
                      strokeWidth={2}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  ) : (
                    <circle
                      cx={xAt(segment[0].index)}
                      cy={yAt(segment[0].value)}
                      r={3}
                      fill={item.color}
                    />
                  )}
                </g>
              );
            }),
          )}

          {hover !== null &&
            series.map((item) => {
              const value = item.values[hover];

              return value === null ? null : (
                <circle
                  key={item.key}
                  cx={xAt(hover)}
                  cy={yAt(value)}
                  r={4.5}
                  fill="#fff"
                  stroke={item.color}
                  strokeWidth={2}
                />
              );
            })}
        </>
      )}
      renderTooltip={(index) => (
        <TooltipBody
          title={buckets[index].fullLabel}
          rows={series.map((item) => {
            const value = item.values[index];

            return {
              label: item.label,
              color: item.color,
              value: value === null ? "No data" : formatValue(value),
            };
          })}
        />
      )}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Stacked bar chart                                                          */
/* -------------------------------------------------------------------------- */

function StackedBarChart({
  buckets,
  counts,
  scale,
}: {
  buckets: Bucket[];
  counts: Counts[];
  scale: { max: number; ticks: number[] };
}) {
  return (
    <ChartFrame
      mode="band"
      labels={buckets.map((bucket) => bucket.label)}
      scale={scale}
      ariaLabel="Documents submitted over time, stacked by status"
      renderPlot={({ xAt, yAt, bandWidth, hover }) => (
        <>
          {counts.map((count, index) => {
            const barWidth = Math.min(40, bandWidth * 0.62);
            let accumulated = 0;

            return (
              <g
                key={buckets[index].start}
                opacity={hover === null || hover === index ? 1 : 0.55}
              >
                {STATUS_ORDER.map((key) => {
                  const value = count[key];

                  if (!value) return null;

                  const bottom = yAt(accumulated);
                  accumulated += value;
                  const top = yAt(accumulated);

                  return (
                    <rect
                      key={key}
                      x={xAt(index) - barWidth / 2}
                      y={top}
                      width={barWidth}
                      height={Math.max(0, bottom - top)}
                      fill={STATUS_META[key].color}
                      stroke="#fff"
                      strokeWidth={1}
                    />
                  );
                })}
              </g>
            );
          })}
        </>
      )}
      renderTooltip={(index) => (
        <TooltipBody
          title={buckets[index].fullLabel}
          rows={STATUS_ORDER.filter(
            (key) => key !== "other" || counts[index].other > 0,
          ).map((key) => ({
            label: STATUS_META[key].label,
            color: STATUS_META[key].color,
            value: String(counts[index][key]),
          }))}
          footer={{ label: "Total", value: String(counts[index].total) }}
        />
      )}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Donut                                                                      */
/* -------------------------------------------------------------------------- */

function StatusDonut({ counts }: { counts: Counts }) {
  const size = 168;
  const stroke = 22;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const segments = STATUS_ORDER.filter((key) => counts[key] > 0);
  const gap = segments.length > 1 ? 3 : 0;

  let offset = 0;

  const legendKeys = STATUS_ORDER.filter(
    (key) => key !== "other" || counts.other > 0,
  );

  return (
    <div>
      <div className="relative mx-auto" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          role="img"
          aria-label="Documents by status"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#F1F5F9"
            strokeWidth={stroke}
          />

          {counts.total > 0 &&
            segments.map((key) => {
              const length = (counts[key] / counts.total) * circumference;
              const dash = Math.max(0, length - gap);
              const currentOffset = offset;

              offset += length;

              return (
                <circle
                  key={key}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={STATUS_META[key].color}
                  strokeWidth={stroke}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-currentOffset}
                />
              );
            })}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold text-slate-900">
            {counts.total}
          </span>

          <span className="text-xs text-slate-400">
            {counts.total === 1 ? "Document" : "Documents"}
          </span>
        </div>
      </div>

      <ul className="mt-6 space-y-2.5">
        {legendKeys.map((key) => {
          const percent =
            counts.total > 0 ? Math.round((counts[key] / counts.total) * 100) : 0;

          return (
            <li key={key} className="flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-2 text-slate-600">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: STATUS_META[key].color }}
                />
                {STATUS_META[key].label}
              </span>

              <span className="text-slate-500">
                <span className="font-semibold text-slate-900">
                  {counts[key]}
                </span>
                <span className="ml-2 text-xs">{percent}%</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Pending review aging                                                       */
/* -------------------------------------------------------------------------- */

function AgingBars({ ages }: { ages: number[] }) {
  const rows = AGING_BUCKETS.map((bucket) => ({
    ...bucket,
    count: ages.filter((age) => age >= bucket.min && age <= bucket.max).length,
  }));

  const max = Math.max(1, ...rows.map((row) => row.count));

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-4">
          <span className="w-20 shrink-0 text-sm text-slate-600">
            {row.label}
          </span>

          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: row.count > 0 ? `${Math.max(4, (row.count / max) * 100)}%` : "0%",
                backgroundColor: row.color,
              }}
            />
          </div>

          <span className="w-8 shrink-0 text-right text-sm font-semibold text-slate-900">
            {row.count}
          </span>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Main component                                                             */
/* -------------------------------------------------------------------------- */

export default function DashboardCharts({
  documents,
  isReviewer,
}: DashboardChartsProps) {
  const [rangeId, setRangeId] = useState<string>("30d");

  const range = RANGES.find((item) => item.id === rangeId) ?? RANGES[1];

  const buckets = useMemo(() => buildBuckets(range), [range]);
  const counts = useMemo(
    () => bucketCounts(documents, buckets),
    [documents, buckets],
  );
  const totals = useMemo(() => countDocuments(documents), [documents]);
  const change = useMemo(
    () => periodChange(documents, buckets),
    [documents, buckets],
  );
  const ages = useMemo(() => pendingAges(documents), [documents]);

  const rangeTotals = useMemo(() => {
    const result = emptyCounts();

    for (const count of counts) {
      for (const key of STATUS_ORDER) result[key] += count[key];
      result.total += count.total;
    }

    return result;
  }, [counts]);

  const volumeScale = useMemo(
    () => niceScale(Math.max(0, ...counts.map((count) => count.total))),
    [counts],
  );

  const decided = rangeTotals.approved + rangeTotals.rejected;
  const approvalRate =
    decided > 0 ? Math.round((rangeTotals.approved / decided) * 100) : null;

  const approvalSeries: Series[] = [
    {
      key: "approval",
      label: "Approval rate",
      color: STATUS_META.approved.color,
      area: true,
      values: counts.map((count) => {
        const done = count.approved + count.rejected;
        return done > 0 ? (count.approved / done) * 100 : null;
      }),
    },
  ];

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-slate-900">
          {isReviewer ? "Organisation overview" : "My activity"}
        </h2>

        <p className="mt-0.5 text-sm text-slate-500">
          {isReviewer
            ? "Document volume, outcomes and review backlog across the organisation."
            : "How your submissions are doing."}
        </p>
      </div>

      <RangeToggle value={rangeId} onChange={setRangeId} />
    </div>
  );

  if (documents.length === 0) {
    return (
      <div className="space-y-4">
        {header}

        <div className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-600">
            No data to chart yet
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Charts will appear here once documents are submitted.
          </p>
        </div>
      </div>
    );
  }

  if (!isReviewer) {
    const oldest = ages.length > 0 ? Math.max(...ages) : null;

    return (
      <div className="space-y-4">
        {header}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <ChartCard
            className="lg:col-span-2"
            title="Submission activity"
            description={`Documents you submitted in ${range.text}`}
          >
            <Metric
              value={rangeTotals.total}
              label={rangeTotals.total === 1 ? "document submitted" : "documents submitted"}
              change={change}
            />

            <TrendChart
              buckets={buckets}
              scale={volumeScale}
              ariaLabel="Documents you submitted over time"
              series={[
                {
                  key: "submitted",
                  label: "Submitted",
                  color: BRAND_COLOR,
                  area: true,
                  values: counts.map((count) => count.total),
                },
              ]}
            />
          </ChartCard>

          <ChartCard
            title="Status breakdown"
            description="All of your documents"
          >
            <StatusDonut counts={totals} />

            {oldest !== null && (
              <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Oldest document awaiting review: {plural(oldest, "day")}
              </p>
            )}
          </ChartCard>
        </div>
      </div>
    );
  }

  const oldestPending = ages.length > 0 ? Math.max(...ages) : null;

  return (
    <div className="space-y-4">
      {header}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="Document volume by status"
          description={`Documents submitted in ${range.text}`}
        >
          <Metric
            value={rangeTotals.total}
            label={rangeTotals.total === 1 ? "document submitted" : "documents submitted"}
            change={change}
          />

          <Legend
            keys={STATUS_ORDER.filter(
              (key) => key !== "other" || rangeTotals.other > 0,
            )}
          />

          <StackedBarChart
            buckets={buckets}
            counts={counts}
            scale={volumeScale}
          />
        </ChartCard>

        <ChartCard title="Overall status" description="All documents">
          <StatusDonut counts={totals} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard
          title="Pending review aging"
          description="How long documents have been waiting for a decision"
        >
          <Metric
            value={ages.length}
            label={
              oldestPending !== null
                ? `awaiting review, oldest ${plural(oldestPending, "day")}`
                : "awaiting review"
            }
          />

          <AgingBars ages={ages} />
        </ChartCard>

        <ChartCard
          title="Approval rate"
          description="Share of decided documents that were approved, by submission period"
        >
          <Metric
            value={approvalRate === null ? "-" : `${approvalRate}%`}
            label={
              approvalRate === null
                ? "no decisions in this period"
                : `approved of ${plural(decided, "decided document")}`
            }
          />

          <TrendChart
            buckets={buckets}
            scale={PERCENT_SCALE}
            ariaLabel="Approval rate over time"
            series={approvalSeries}
            formatTick={(value) => `${value}%`}
            formatValue={(value) => `${Math.round(value)}%`}
          />
        </ChartCard>
      </div>
    </div>
  );
}