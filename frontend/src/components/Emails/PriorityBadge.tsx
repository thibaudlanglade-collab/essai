type Priority = "urgent" | "important" | "normal" | "low";

type Props = {
  priority: string | null | undefined;
  size?: "sm" | "md";
};

const PRIORITY_CONFIG: Record<Priority, { classes: string; label: string }> = {
  urgent: { classes: "bg-red-500/15 text-red-300", label: "Urgent" },
  important: { classes: "bg-amber-500/15 text-amber-300", label: "Important" },
  normal: { classes: "bg-blue-500/15 text-blue-300", label: "Normal" },
  low: { classes: "bg-gray-500/15 text-gray-400", label: "Faible" },
};

export default function PriorityBadge({ priority, size = "sm" }: Props) {
  if (!priority) return null;

  const config = PRIORITY_CONFIG[priority as Priority];
  if (!config) return null;

  const padding = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${padding} ${config.classes}`}
    >
      {config.label}
    </span>
  );
}
