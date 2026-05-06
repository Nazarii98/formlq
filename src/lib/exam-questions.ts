import { ExamQuestion } from "@/types";

// Raw score 0–32 → NMT 100–200 (20/32 ≈ 147)
export const NMT_SCORE_TABLE: number[] = [
  100, 100, 101, 103,  // 0–3
  105, 107, 109, 111,  // 4–7
  113, 115, 117, 120,  // 8–11
  122, 124, 127, 130,  // 12–15
  133, 135, 139, 143,  // 16–19
  147, 150, 153, 156,  // 20–23
  159, 162, 165, 169,  // 24–27
  173, 177, 182, 191,  // 28–31
  200,                  // 32
];

export function rawToNMT(raw: number): number {
  const clamped = Math.max(0, Math.min(32, Math.round(raw)));
  return NMT_SCORE_TABLE[clamped];
}

export const MAX_RAW_SCORE = 32; // 15×1 + 3×3 + 4×2

export const EXAM_QUESTIONS: ExamQuestion[] = [
  // ── MCQ 1–15 (1 pt each) ─────────────────────────────────────
  {
    id: "e1",
    type: "mcq",
    topicId: "algebra",
    text: "Знайдіть суму коренів рівняння x² − 5x + 6 = 0",
    options: [
      { id: "А", text: "5" },
      { id: "Б", text: "6" },
      { id: "В", text: "−5" },
      { id: "Г", text: "−6" },
      { id: "Д", text: "3" },
    ],
    correctOptionId: "А",
    explanation: "За формулою Вієта: x₁ + x₂ = −(−5)/1 = 5.",
  },
  {
    id: "e2",
    type: "mcq",
    topicId: "algebra",
    text: "Яка область визначення функції f(x) = √(x − 3)?",
    options: [
      { id: "А", text: "x ≥ 3" },
      { id: "Б", text: "x > 3" },
      { id: "В", text: "x ≤ 3" },
      { id: "Г", text: "x < 3" },
      { id: "Д", text: "Усі дійсні числа" },
    ],
    correctOptionId: "А",
    explanation: "Підкореневий вираз x − 3 ≥ 0, звідки x ≥ 3.",
  },
  {
    id: "e3",
    type: "mcq",
    topicId: "numbers",
    text: "Знайдіть значення виразу log₃ 81",
    options: [
      { id: "А", text: "4" },
      { id: "Б", text: "3" },
      { id: "В", text: "27" },
      { id: "Г", text: "9" },
      { id: "Д", text: "2" },
    ],
    correctOptionId: "А",
    explanation: "3⁴ = 81, тому log₃ 81 = 4.",
  },
  {
    id: "e4",
    type: "mcq",
    topicId: "algebra",
    text: "Похідна функції f(x) = x² − 3x + 1 у точці x = 2 дорівнює:",
    options: [
      { id: "А", text: "1" },
      { id: "Б", text: "−1" },
      { id: "В", text: "3" },
      { id: "Г", text: "2" },
      { id: "Д", text: "0" },
    ],
    correctOptionId: "А",
    explanation: "f′(x) = 2x − 3. При x = 2: f′(2) = 4 − 3 = 1.",
  },
  {
    id: "e5",
    type: "mcq",
    topicId: "numbers",
    text: "Скільки відсотків становить 3/4?",
    options: [
      { id: "А", text: "75%" },
      { id: "Б", text: "34%" },
      { id: "В", text: "25%" },
      { id: "Г", text: "0,75%" },
      { id: "Д", text: "43%" },
    ],
    correctOptionId: "А",
    explanation: "3/4 = 0,75 = 75%.",
  },
  {
    id: "e6",
    type: "mcq",
    topicId: "numbers",
    text: "Спростіть вираз √50",
    options: [
      { id: "А", text: "5√2" },
      { id: "Б", text: "25√2" },
      { id: "В", text: "10√5" },
      { id: "Г", text: "5√10" },
      { id: "Д", text: "2√5" },
    ],
    correctOptionId: "А",
    explanation: "√50 = √(25 · 2) = 5√2.",
  },
  {
    id: "e7",
    type: "mcq",
    topicId: "equations",
    text: "Розв'яжіть рівняння 2^x = 32",
    options: [
      { id: "А", text: "5" },
      { id: "Б", text: "16" },
      { id: "В", text: "6" },
      { id: "Г", text: "4" },
      { id: "Д", text: "3" },
    ],
    correctOptionId: "А",
    explanation: "2^5 = 32, тому x = 5.",
  },
  {
    id: "e8",
    type: "mcq",
    topicId: "equations",
    text: "Дано систему: x + y = 5, x − y = 1. Знайдіть x.",
    options: [
      { id: "А", text: "3" },
      { id: "Б", text: "2" },
      { id: "В", text: "4" },
      { id: "Г", text: "5" },
      { id: "Д", text: "1" },
    ],
    correctOptionId: "А",
    explanation: "Додаємо рівняння: 2x = 6, x = 3. Тоді y = 2.",
  },
  {
    id: "e9",
    type: "mcq",
    topicId: "equations",
    text: "Скільки цілих чисел є розв'язками нерівності |x| < 3?",
    options: [
      { id: "А", text: "5" },
      { id: "Б", text: "3" },
      { id: "В", text: "6" },
      { id: "Г", text: "4" },
      { id: "Д", text: "7" },
    ],
    correctOptionId: "А",
    explanation: "|x| < 3 ⟺ −3 < x < 3. Цілі: −2, −1, 0, 1, 2 — усього 5.",
  },
  {
    id: "e10",
    type: "mcq",
    topicId: "geometry",
    text: "Площа трикутника з основою 8 і висотою 5 дорівнює:",
    options: [
      { id: "А", text: "20" },
      { id: "Б", text: "40" },
      { id: "В", text: "13" },
      { id: "Г", text: "10" },
      { id: "Д", text: "80" },
    ],
    correctOptionId: "А",
    explanation: "S = ½ · b · h = ½ · 8 · 5 = 20.",
  },
  {
    id: "e11",
    type: "mcq",
    topicId: "geometry",
    text: "У прямокутному трикутнику катети рівні 6 і 8. Знайдіть гіпотенузу.",
    options: [
      { id: "А", text: "10" },
      { id: "Б", text: "14" },
      { id: "В", text: "48" },
      { id: "Г", text: "7" },
      { id: "Д", text: "√28" },
    ],
    correctOptionId: "А",
    explanation: "c = √(6² + 8²) = √100 = 10.",
  },
  {
    id: "e12",
    type: "mcq",
    topicId: "geometry",
    text: "Довжина кола з радіусом 5 дорівнює:",
    options: [
      { id: "А", text: "10π" },
      { id: "Б", text: "25π" },
      { id: "В", text: "5π" },
      { id: "Г", text: "2π" },
      { id: "Д", text: "50π" },
    ],
    correctOptionId: "А",
    explanation: "C = 2πr = 2 · π · 5 = 10π.",
  },
  {
    id: "e13",
    type: "mcq",
    topicId: "geometry",
    text: "Координати вектора AB, де A(1, 2) і B(4, 6):",
    options: [
      { id: "А", text: "(3; 4)" },
      { id: "Б", text: "(5; 8)" },
      { id: "В", text: "(−3; −4)" },
      { id: "Г", text: "(4; 3)" },
      { id: "Д", text: "(2; 3)" },
    ],
    correctOptionId: "А",
    explanation: "AB⃗ = (4−1; 6−2) = (3; 4).",
  },
  {
    id: "e14",
    type: "mcq",
    topicId: "probability",
    text: "Скількома способами можна обрати 2 предмети з 6?",
    options: [
      { id: "А", text: "15" },
      { id: "Б", text: "30" },
      { id: "В", text: "12" },
      { id: "Г", text: "36" },
      { id: "Д", text: "720" },
    ],
    correctOptionId: "А",
    explanation: "C(6,2) = 6!/(2!·4!) = 15.",
  },
  {
    id: "e15",
    type: "mcq",
    topicId: "statistics",
    text: "Середнє арифметичне чисел 4, 7, 10, 13, 16 дорівнює:",
    options: [
      { id: "А", text: "10" },
      { id: "Б", text: "8" },
      { id: "В", text: "12" },
      { id: "Г", text: "9" },
      { id: "Д", text: "11" },
    ],
    correctOptionId: "А",
    explanation: "(4+7+10+13+16)/5 = 50/5 = 10.",
  },

  // ── Matching 16–18 (3 pts each) ─────────────────────────────
  {
    id: "e16",
    type: "matching",
    topicId: "algebra",
    text: "Встановіть відповідність між функцією та її областю визначення:",
    leftItems: [
      { id: "1", text: "y = 1/x" },
      { id: "2", text: "y = √x" },
      { id: "3", text: "y = log₂ x" },
      { id: "4", text: "y = x²" },
    ],
    rightOptions: [
      { id: "А", text: "x > 0" },
      { id: "Б", text: "x ≠ 0" },
      { id: "В", text: "x ≥ 0" },
      { id: "Г", text: "Усі дійсні числа" },
      { id: "Д", text: "x < 0" },
    ],
    correctPairs: { "1": "Б", "2": "В", "3": "А", "4": "Г" },
    explanation: "1/x: x≠0; √x: x≥0; log₂x: x>0; x²: усі ℝ.",
  },
  {
    id: "e17",
    type: "matching",
    topicId: "geometry",
    text: "Встановіть відповідність між геометричною фігурою та формулою площі:",
    leftItems: [
      { id: "1", text: "Квадрат зі стороною a" },
      { id: "2", text: "Коло з радіусом r" },
      { id: "3", text: "Трикутник (основа b, висота h)" },
      { id: "4", text: "Прямокутник зі сторонами a і b" },
    ],
    rightOptions: [
      { id: "А", text: "πr²" },
      { id: "Б", text: "a²" },
      { id: "В", text: "ab" },
      { id: "Г", text: "½bh" },
      { id: "Д", text: "2πr" },
    ],
    correctPairs: { "1": "Б", "2": "А", "3": "Г", "4": "В" },
    explanation: "Квадрат: a²; Коло: πr²; Трикутник: ½bh; Прямокутник: ab.",
  },
  {
    id: "e18",
    type: "matching",
    topicId: "equations",
    text: "Встановіть відповідність між рівнянням та його типом:",
    leftItems: [
      { id: "1", text: "2x + 3 = 7" },
      { id: "2", text: "x² − 4 = 0" },
      { id: "3", text: "2^x = 8" },
      { id: "4", text: "sin x = 0" },
    ],
    rightOptions: [
      { id: "А", text: "Квадратне рівняння" },
      { id: "Б", text: "Тригонометричне рівняння" },
      { id: "В", text: "Показникове рівняння" },
      { id: "Г", text: "Лінійне рівняння" },
      { id: "Д", text: "Логарифмічне рівняння" },
    ],
    correctPairs: { "1": "Г", "2": "А", "3": "В", "4": "Б" },
    explanation: "2x+3=7 — лінійне; x²−4=0 — квадратне; 2^x=8 — показникове; sin x=0 — тригонометричне.",
  },

  // ── Open answer 19–22 (2 pts each) ──────────────────────────
  {
    id: "e19",
    type: "open",
    topicId: "geometry",
    text: "Знайдіть площу трапеції з основами 4 і 8 та висотою 6. Запишіть число.",
    correctAnswer: "36",
    explanation: "S = (a+b)/2 · h = (4+8)/2 · 6 = 6 · 6 = 36.",
  },
  {
    id: "e20",
    type: "open",
    topicId: "numbers",
    text: "Обчисліть (√3 + 1)(√3 − 1). Запишіть число.",
    correctAnswer: "2",
    explanation: "(√3+1)(√3−1) = 3 − 1 = 2.",
  },
  {
    id: "e21",
    type: "open",
    topicId: "equations",
    text: "Знайдіть суму коренів рівняння 3x² − 12x + 4 = 0. Запишіть число.",
    correctAnswer: "4",
    explanation: "За Вієтою: x₁+x₂ = 12/3 = 4.",
  },
  {
    id: "e22",
    type: "open",
    topicId: "statistics",
    text: "У класі 30 учнів, 40% — дівчата. Скільки дівчат? Запишіть число.",
    correctAnswer: "12",
    explanation: "30 · 0,4 = 12.",
  },
];

export function calcRawScore(questions: ExamQuestion[], answers: Record<string, string>): number {
  let score = 0;
  for (const q of questions) {
    const ans = answers[q.id] ?? "";
    if (q.type === "mcq") {
      if (ans === q.correctOptionId) score += 1;
    } else if (q.type === "matching") {
      try {
        const userPairs = JSON.parse(ans) as Record<string, string>;
        const allCorrect = Object.entries(q.correctPairs).every(
          ([leftId, rightId]) => userPairs[leftId] === rightId,
        );
        if (allCorrect) score += 3;
      } catch {
        // no score
      }
    } else if (q.type === "open") {
      if (ans.trim() === q.correctAnswer.trim()) score += 2;
    }
  }
  return score;
}
