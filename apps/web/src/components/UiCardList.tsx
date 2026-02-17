import { UiCard } from "./UiCard";

interface CardItem {
  id: string;
  title: string;
  body: string;
  priority: "low" | "medium" | "high";
  cardType: string;
  prompt?: string | null;
}

interface UiCardListProps {
  cards: CardItem[];
}

const priorityRank: Record<CardItem["priority"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function UiCardList({ cards }: UiCardListProps) {
  const sorted = [...cards].sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);

  if (sorted.length === 0) {
    return <p className="muted">No active cards.</p>;
  }

  return (
    <div className="grid">
      {sorted.map((card) => (
        <UiCard key={card.id} {...card} />
      ))}
    </div>
  );
}
