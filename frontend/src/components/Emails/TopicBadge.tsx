import type { EmailTopic } from "../../api/emailTopicsClient";

type Props = {
  topic: EmailTopic | null | undefined;
  size?: "sm" | "md";
};

export default function TopicBadge({ topic, size = "sm" }: Props) {
  if (!topic) return null;

  const padding = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs";

  // Convert hex color to rgb for opacity trick
  const hex = topic.color.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${padding}`}
      style={{
        backgroundColor: `rgba(${r}, ${g}, ${b}, 0.15)`,
        color: topic.color,
      }}
    >
      {topic.name}
    </span>
  );
}
