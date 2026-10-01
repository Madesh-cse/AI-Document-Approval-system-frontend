import {
  STATUS_STYLE,
  VALIDATION_STYLE,
} from "./dashboard-data";

interface PillProps {
  children: string;
  type: "validation" | "status";
}

export default function Pill({
  children,
  type,
}: PillProps) {
  const styles =
    type === "validation"
      ? VALIDATION_STYLE[children]
      : STATUS_STYLE[children];

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${styles}`}
    >
      {children}
    </span>
  );
}