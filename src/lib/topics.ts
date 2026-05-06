import { Topic } from "@/types";

export const TOPICS: Topic[] = [
  { id: "algebra", name: "Алгебра і початки аналізу", slug: "algebra", description: "Рівняння, функції, похідні, інтеграли", icon: "📐", order: 1, questionCount: 120 },
  { id: "geometry", name: "Геометрія", slug: "geometry", description: "Планіметрія, стереометрія, координати", icon: "📏", order: 2, questionCount: 80 },
  { id: "numbers", name: "Числа і вирази", slug: "numbers", description: "Дроби, степені, логарифми, корені", icon: "🔢", order: 3, questionCount: 60 },
  { id: "equations", name: "Рівняння та нерівності", slug: "equations", description: "Лінійні, квадратні, системи, тригонометричні", icon: "⚖️", order: 4, questionCount: 90 },
  { id: "probability", name: "Комбінаторика і ймовірність", slug: "probability", description: "Перестановки, комбінації, теорія ймовірностей", icon: "🎲", order: 5, questionCount: 40 },
  { id: "statistics", name: "Статистика", slug: "statistics", description: "Середнє значення, медіана, діаграми", icon: "📊", order: 6, questionCount: 30 },
];

export function getTopicBySlug(slug: string): Topic | undefined {
  return TOPICS.find((t) => t.slug === slug);
}

export function getTopicById(id: string): Topic | undefined {
  return TOPICS.find((t) => t.id === id);
}
