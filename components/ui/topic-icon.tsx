import {
  Blocks,
  Frame,
  HandHeart,
  HeartPulse,
  PiggyBank,
  Repeat,
  Scale,
  ShoppingCart,
  Tag,
  ToggleLeft,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** One glyph per interest topic; anything new in the taxonomy falls back to a tag. */
const TOPIC_ICONS: Record<string, LucideIcon> = {
  "choice architecture": Blocks,
  "financial nudging": PiggyBank,
  defaults: ToggleLeft,
  energy: Zap,
  "health communication": HeartPulse,
  framing: Frame,
  prosocial: HandHeart,
  "consumer choice": ShoppingCart,
  "risk perception": Scale,
  "habit formation": Repeat,
};

export function TopicIcon({ topic, size = 16 }: { topic: string; size?: number }) {
  const Icon = TOPIC_ICONS[topic] ?? Tag;
  return <Icon size={size} strokeWidth={1.5} absoluteStrokeWidth aria-hidden="true" focusable="false" />;
}
