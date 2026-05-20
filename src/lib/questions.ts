import { Question } from "@/types";
import { BankQuestion } from "@/lib/tests";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  addDoc,
  setDoc,
  deleteDoc,
  limit,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// ── Daily answer ──────────────────────────────────────────────────────────────

export interface DailyAnswer {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  questionId: string;
  isCorrect: boolean;
  answeredAt: Timestamp | null;
}

export function todayDateKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function getDailyQuestion(): Promise<BankQuestion | null> {
  const snap = await getDocs(collection(db, "questions"));
  const approved = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as BankQuestion)
    .filter((q) => q.status === "approved")
    .sort((a, b) => {
      if (a.dailyOrder != null && b.dailyOrder != null) return a.dailyOrder - b.dailyOrder;
      if (a.dailyOrder != null) return -1;
      if (b.dailyOrder != null) return 1;
      return a.id.localeCompare(b.id);
    });
  if (!approved.length) return null;
  const start = new Date(new Date().getFullYear(), 0, 0);
  const dayOfYear = Math.floor((Date.now() - start.getTime()) / 86_400_000);
  return approved[dayOfYear % approved.length];
}

export async function getTodayDailyAnswer(userId: string): Promise<DailyAnswer | null> {
  const snap = await getDoc(doc(db, "dailyAnswers", `${userId}_${todayDateKey()}`));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as DailyAnswer;
}

export async function saveDailyAnswer(userId: string, questionId: string, isCorrect: boolean): Promise<void> {
  const date = todayDateKey();
  await setDoc(doc(db, "dailyAnswers", `${userId}_${date}`), {
    userId, date, questionId, isCorrect,
    answeredAt: serverTimestamp(),
  });
}

export async function getDailyAnswerDates(userId: string): Promise<string[]> {
  const q = query(collection(db, "dailyAnswers"), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data().date as string);
}

export async function createQuestion(data: Omit<BankQuestion, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "questions"), data);
  return ref.id;
}

export async function getAllQuestions(): Promise<BankQuestion[]> {
  const snap = await getDocs(collection(db, "questions"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as BankQuestion);
}

export async function updateQuestion(id: string, data: Partial<BankQuestion>): Promise<void> {
  const clean = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined)
  );
  await updateDoc(doc(db, "questions", id), clean);
}

export async function deleteQuestion(id: string): Promise<void> {
  await deleteDoc(doc(db, "questions", id));
}

export async function getQuestionsByTopic(
  topicId: string,
  count = 10,
): Promise<Question[]> {
  const q = query(
    collection(db, "questions"),
    where("topicId", "==", topicId),
    orderBy("difficulty"),
    limit(count),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Question);
}

export const SAMPLE_QUESTIONS: Omit<Question, "id">[] = [
  // Algebra
  {
    topicId: "algebra",
    text: "Знайдіть корені рівняння x² − 5x + 6 = 0",
    options: [
      { id: "a", text: "x = 2 і x = 3" },
      { id: "b", text: "x = −2 і x = −3" },
      { id: "c", text: "x = 1 і x = 6" },
      { id: "d", text: "x = −1 і x = −6" },
    ],
    correctOptionId: "a",
    explanation:
      "За формулою дискримінанта: D = 25 − 24 = 1. x = (5 ± 1) / 2. Маємо x₁ = 3, x₂ = 2.",
    difficulty: 1,
  },
  {
    topicId: "algebra",
    text: "Яке значення має вираз 2³ · 2⁴?",
    options: [
      { id: "a", text: "2⁷ = 128" },
      { id: "b", text: "2¹² = 4096" },
      { id: "c", text: "4⁷ = 16384" },
      { id: "d", text: "2⁶ = 64" },
    ],
    correctOptionId: "a",
    explanation:
      "При множенні степенів з однаковою основою показники додаються: 2³ · 2⁴ = 2^(3+4) = 2⁷ = 128.",
    difficulty: 1,
  },
  {
    topicId: "algebra",
    text: "Функція f(x) = x² − 4x + 3. Знайдіть вершину параболи.",
    options: [
      { id: "a", text: "(2; −1)" },
      { id: "b", text: "(−2; 15)" },
      { id: "c", text: "(2; 3)" },
      { id: "d", text: "(4; 3)" },
    ],
    correctOptionId: "a",
    explanation:
      "Вершина параболи: x₀ = −b/(2a) = 4/2 = 2. y₀ = f(2) = 4 − 8 + 3 = −1. Вершина: (2; −1).",
    difficulty: 2,
  },
  {
    topicId: "algebra",
    text: "Знайдіть похідну функції f(x) = x³ − 3x² + 2",
    options: [
      { id: "a", text: "3x² − 6x" },
      { id: "b", text: "3x² − 3" },
      { id: "c", text: "x² − 6x" },
      { id: "d", text: "3x³ − 6x" },
    ],
    correctOptionId: "a",
    explanation: "f'(x) = (x³)' − (3x²)' + (2)' = 3x² − 6x + 0 = 3x² − 6x.",
    difficulty: 3,
  },
  {
    topicId: "algebra",
    text: "Знайдіть значення виразу: (3x − 2)² при x = 2",
    options: [
      { id: "a", text: "16" },
      { id: "b", text: "8" },
      { id: "c", text: "4" },
      { id: "d", text: "36" },
    ],
    correctOptionId: "a",
    explanation: "При x = 2: (3·2 − 2)² = (6 − 2)² = 4² = 16.",
    difficulty: 1,
  },
  {
    topicId: "algebra",
    text: "Для якого x функція f(x) = x² − 6x + 5 набуває мінімального значення?",
    options: [
      { id: "a", text: "x = 3" },
      { id: "b", text: "x = 5" },
      { id: "c", text: "x = 1" },
      { id: "d", text: "x = −3" },
    ],
    correctOptionId: "a",
    explanation: "Мінімум параболи при x = −b/(2a) = 6/2 = 3.",
    difficulty: 2,
  },
  {
    topicId: "algebra",
    text: "Скільки коренів має рівняння x² + 4 = 0?",
    options: [
      { id: "a", text: "0 (немає дійсних коренів)" },
      { id: "b", text: "1" },
      { id: "c", text: "2" },
      { id: "d", text: "4" },
    ],
    correctOptionId: "a",
    explanation:
      "D = 0 − 4·4 = −16 < 0. Від'ємний дискримінант → немає дійсних коренів.",
    difficulty: 2,
  },
  {
    topicId: "algebra",
    text: "Знайдіть область визначення функції f(x) = √(x − 3)",
    options: [
      { id: "a", text: "x ≥ 3" },
      { id: "b", text: "x > 3" },
      { id: "c", text: "x ≤ 3" },
      { id: "d", text: "всі дійсні числа" },
    ],
    correctOptionId: "a",
    explanation: "Підкореневий вираз ≥ 0: x − 3 ≥ 0 → x ≥ 3.",
    difficulty: 2,
  },
  {
    topicId: "algebra",
    text: "Спростіть: (a³)⁴",
    options: [
      { id: "a", text: "a¹²" },
      { id: "b", text: "a⁷" },
      { id: "c", text: "4a³" },
      { id: "d", text: "a³⁴" },
    ],
    correctOptionId: "a",
    explanation:
      "При піднесенні степеня до степеня показники множаться: (a³)⁴ = a^(3·4) = a¹².",
    difficulty: 1,
  },
  {
    topicId: "algebra",
    text: "Яка з функцій є лінійною?",
    options: [
      { id: "a", text: "f(x) = 3x − 7" },
      { id: "b", text: "f(x) = x²" },
      { id: "c", text: "f(x) = 1/x" },
      { id: "d", text: "f(x) = √x" },
    ],
    correctOptionId: "a",
    explanation:
      "Лінійна функція має вигляд f(x) = kx + b. Тільки 3x − 7 відповідає цьому.",
    difficulty: 1,
  },
  {
    topicId: "algebra",
    text: "Знайдіть f'(x), якщо f(x) = 5x⁴",
    options: [
      { id: "a", text: "20x³" },
      { id: "b", text: "5x³" },
      { id: "c", text: "20x⁴" },
      { id: "d", text: "4x⁴" },
    ],
    correctOptionId: "a",
    explanation:
      "f'(x) = 5 · 4x³ = 20x³ за правилом диференціювання степеневої функції.",
    difficulty: 3,
  },
  // Geometry
  {
    topicId: "geometry",
    text: "Знайдіть площу прямокутника зі сторонами 7 см і 4 см.",
    options: [
      { id: "a", text: "28 см²" },
      { id: "b", text: "22 см²" },
      { id: "c", text: "11 см²" },
      { id: "d", text: "14 см²" },
    ],
    correctOptionId: "a",
    explanation: "Площа прямокутника: S = a · b = 7 · 4 = 28 см².",
    difficulty: 1,
  },
  {
    topicId: "geometry",
    text: "У прямокутному трикутнику катети рівні 3 і 4. Знайдіть гіпотенузу.",
    options: [
      { id: "a", text: "5" },
      { id: "b", text: "7" },
      { id: "c", text: "√7" },
      { id: "d", text: "25" },
    ],
    correctOptionId: "a",
    explanation: "За теоремою Піфагора: c² = a² + b² = 9 + 16 = 25. c = 5.",
    difficulty: 1,
  },
  {
    topicId: "geometry",
    text: "Знайдіть площу кола з радіусом 6 (π ≈ 3.14).",
    options: [
      { id: "a", text: "≈ 113.04" },
      { id: "b", text: "≈ 37.68" },
      { id: "c", text: "≈ 18.84" },
      { id: "d", text: "≈ 226.08" },
    ],
    correctOptionId: "a",
    explanation: "S = πr² = 3.14 · 36 ≈ 113.04.",
    difficulty: 1,
  },
  {
    topicId: "geometry",
    text: "Знайдіть периметр квадрата зі стороною 9 см.",
    options: [
      { id: "a", text: "36 см" },
      { id: "b", text: "18 см" },
      { id: "c", text: "81 см" },
      { id: "d", text: "45 см" },
    ],
    correctOptionId: "a",
    explanation: "P = 4a = 4 · 9 = 36 см.",
    difficulty: 1,
  },
  {
    topicId: "geometry",
    text: "Кут трикутника рівні 40° і 70°. Знайдіть третій кут.",
    options: [
      { id: "a", text: "70°" },
      { id: "b", text: "50°" },
      { id: "c", text: "90°" },
      { id: "d", text: "110°" },
    ],
    correctOptionId: "a",
    explanation:
      "Сума кутів трикутника = 180°. Третій кут = 180 − 40 − 70 = 70°.",
    difficulty: 1,
  },
  {
    topicId: "geometry",
    text: "Знайдіть об'єм куба зі стороною 4 см.",
    options: [
      { id: "a", text: "64 см³" },
      { id: "b", text: "16 см³" },
      { id: "c", text: "48 см³" },
      { id: "d", text: "96 см³" },
    ],
    correctOptionId: "a",
    explanation: "V = a³ = 4³ = 64 см³.",
    difficulty: 1,
  },
  {
    topicId: "geometry",
    text: "Діагональ прямокутника 13 см, одна сторона 5 см. Знайдіть другу сторону.",
    options: [
      { id: "a", text: "12 см" },
      { id: "b", text: "8 см" },
      { id: "c", text: "10 см" },
      { id: "d", text: "√194 см" },
    ],
    correctOptionId: "a",
    explanation:
      "За теоремою Піфагора: b = √(13² − 5²) = √(169 − 25) = √144 = 12 см.",
    difficulty: 2,
  },
  {
    topicId: "geometry",
    text: "Знайдіть довжину кола з радіусом 5 (π ≈ 3.14).",
    options: [
      { id: "a", text: "≈ 31.4" },
      { id: "b", text: "≈ 15.7" },
      { id: "c", text: "≈ 78.5" },
      { id: "d", text: "≈ 10" },
    ],
    correctOptionId: "a",
    explanation: "C = 2πr = 2 · 3.14 · 5 ≈ 31.4.",
    difficulty: 1,
  },
  {
    topicId: "geometry",
    text: "Площа трикутника зі основою 10 і висотою 6 дорівнює:",
    options: [
      { id: "a", text: "30" },
      { id: "b", text: "60" },
      { id: "c", text: "16" },
      { id: "d", text: "15" },
    ],
    correctOptionId: "a",
    explanation: "S = (1/2) · a · h = (1/2) · 10 · 6 = 30.",
    difficulty: 1,
  },
  // Numbers
  {
    topicId: "numbers",
    text: "Спростіть: log₂(8)",
    options: [
      { id: "a", text: "3" },
      { id: "b", text: "2" },
      { id: "c", text: "4" },
      { id: "d", text: "8" },
    ],
    correctOptionId: "a",
    explanation: "log₂(8) = log₂(2³) = 3, бо 2³ = 8.",
    difficulty: 1,
  },
  {
    topicId: "numbers",
    text: "Знайдіть значення: √144",
    options: [
      { id: "a", text: "12" },
      { id: "b", text: "14" },
      { id: "c", text: "11" },
      { id: "d", text: "72" },
    ],
    correctOptionId: "a",
    explanation: "√144 = 12, бо 12² = 144.",
    difficulty: 1,
  },
  {
    topicId: "numbers",
    text: "Знайдіть значення: 5⁰",
    options: [
      { id: "a", text: "1" },
      { id: "b", text: "0" },
      { id: "c", text: "5" },
      { id: "d", text: "∞" },
    ],
    correctOptionId: "a",
    explanation: "Будь-яке число (крім 0) у степені 0 дорівнює 1.",
    difficulty: 1,
  },
  {
    topicId: "numbers",
    text: "Порівняйте дроби: 3/4 та 5/7",
    options: [
      { id: "a", text: "3/4 > 5/7" },
      { id: "b", text: "3/4 < 5/7" },
      { id: "c", text: "3/4 = 5/7" },
      { id: "d", text: "неможливо порівняти" },
    ],
    correctOptionId: "a",
    explanation: "3/4 = 21/28, 5/7 = 20/28. Оскільки 21 > 20, то 3/4 > 5/7.",
    difficulty: 2,
  },
  {
    topicId: "numbers",
    text: "log₁₀(1000) = ?",
    options: [
      { id: "a", text: "3" },
      { id: "b", text: "100" },
      { id: "c", text: "10" },
      { id: "d", text: "4" },
    ],
    correctOptionId: "a",
    explanation: "log₁₀(1000) = log₁₀(10³) = 3.",
    difficulty: 1,
  },
  {
    topicId: "numbers",
    text: "Знайдіть: 2⁻³",
    options: [
      { id: "a", text: "1/8" },
      { id: "b", text: "−8" },
      { id: "c", text: "−6" },
      { id: "d", text: "1/6" },
    ],
    correctOptionId: "a",
    explanation: "2⁻³ = 1/2³ = 1/8.",
    difficulty: 2,
  },
  {
    topicId: "numbers",
    text: "√(49/25) = ?",
    options: [
      { id: "a", text: "7/5" },
      { id: "b", text: "49/5" },
      { id: "c", text: "7/25" },
      { id: "d", text: "2" },
    ],
    correctOptionId: "a",
    explanation: "√(49/25) = √49 / √25 = 7/5.",
    difficulty: 2,
  },
  {
    topicId: "numbers",
    text: "Яке число є простим?",
    options: [
      { id: "a", text: "17" },
      { id: "b", text: "21" },
      { id: "c", text: "15" },
      { id: "d", text: "27" },
    ],
    correctOptionId: "a",
    explanation:
      "17 ділиться тільки на 1 і 17. Числа 21, 15, 27 мають інші дільники.",
    difficulty: 1,
  },
  // Equations
  {
    topicId: "equations",
    text: "Розвʼяжіть нерівність: 2x − 6 > 0",
    options: [
      { id: "a", text: "x > 3" },
      { id: "b", text: "x < 3" },
      { id: "c", text: "x > −3" },
      { id: "d", text: "x < 6" },
    ],
    correctOptionId: "a",
    explanation: "2x > 6 → x > 3.",
    difficulty: 1,
  },
  {
    topicId: "equations",
    text: "Система рівнянь: x + y = 5, x − y = 1. Знайдіть x.",
    options: [
      { id: "a", text: "3" },
      { id: "b", text: "2" },
      { id: "c", text: "4" },
      { id: "d", text: "1" },
    ],
    correctOptionId: "a",
    explanation: "Додамо рівняння: 2x = 6, x = 3. Тоді y = 5 − 3 = 2.",
    difficulty: 2,
  },
  {
    topicId: "equations",
    text: "Розв'яжіть рівняння: 3x + 9 = 0",
    options: [
      { id: "a", text: "x = −3" },
      { id: "b", text: "x = 3" },
      { id: "c", text: "x = 9" },
      { id: "d", text: "x = −9" },
    ],
    correctOptionId: "a",
    explanation: "3x = −9 → x = −3.",
    difficulty: 1,
  },
  {
    topicId: "equations",
    text: "Розв'яжіть: |x − 3| = 5",
    options: [
      { id: "a", text: "x = 8 або x = −2" },
      { id: "b", text: "x = 8" },
      { id: "c", text: "x = −2" },
      { id: "d", text: "x = 2 або x = −8" },
    ],
    correctOptionId: "a",
    explanation: "x − 3 = 5 → x = 8; або x − 3 = −5 → x = −2.",
    difficulty: 2,
  },
  {
    topicId: "equations",
    text: "При якому x нерівність 5 − 2x ≥ 1 є правдивою?",
    options: [
      { id: "a", text: "x ≤ 2" },
      { id: "b", text: "x ≥ 2" },
      { id: "c", text: "x ≤ −2" },
      { id: "d", text: "x ≥ −2" },
    ],
    correctOptionId: "a",
    explanation:
      "5 − 2x ≥ 1 → −2x ≥ −4 → x ≤ 2 (при діленні на від'ємне знак міняється).",
    difficulty: 2,
  },
  {
    topicId: "equations",
    text: "Знайдіть суму коренів рівняння x² − 7x + 10 = 0",
    options: [
      { id: "a", text: "7" },
      { id: "b", text: "10" },
      { id: "c", text: "−7" },
      { id: "d", text: "−10" },
    ],
    correctOptionId: "a",
    explanation: "За теоремою Вієта: x₁ + x₂ = −b/a = 7/1 = 7.",
    difficulty: 2,
  },
  {
    topicId: "equations",
    text: "Добуток коренів рівняння 2x² − 6x + 4 = 0 дорівнює:",
    options: [
      { id: "a", text: "2" },
      { id: "b", text: "4" },
      { id: "c", text: "−2" },
      { id: "d", text: "3" },
    ],
    correctOptionId: "a",
    explanation: "За теоремою Вієта: x₁ · x₂ = c/a = 4/2 = 2.",
    difficulty: 3,
  },
  {
    topicId: "equations",
    text: "Розв'яжіть: 2ˣ = 16",
    options: [
      { id: "a", text: "x = 4" },
      { id: "b", text: "x = 8" },
      { id: "c", text: "x = 2" },
      { id: "d", text: "x = 16" },
    ],
    correctOptionId: "a",
    explanation: "2ˣ = 2⁴ → x = 4.",
    difficulty: 2,
  },
  // Probability
  {
    topicId: "probability",
    text: "Скількома способами можна вибрати 2 предмети з 5?",
    options: [
      { id: "a", text: "10" },
      { id: "b", text: "20" },
      { id: "c", text: "5" },
      { id: "d", text: "25" },
    ],
    correctOptionId: "a",
    explanation: "C(5,2) = 5! / (2! · 3!) = (5 · 4) / (2 · 1) = 10.",
    difficulty: 2,
  },
  {
    topicId: "probability",
    text: "Монету кидають двічі. Яка ймовірність випадання двох орлів?",
    options: [
      { id: "a", text: "1/4" },
      { id: "b", text: "1/2" },
      { id: "c", text: "1/3" },
      { id: "d", text: "2/4" },
    ],
    correctOptionId: "a",
    explanation:
      "P = 1/2 · 1/2 = 1/4. Кожне кидання незалежне, ймовірності множаться.",
    difficulty: 1,
  },
  {
    topicId: "probability",
    text: "Яка ймовірність випадання числа більше 4 при киданні кубика?",
    options: [
      { id: "a", text: "1/3" },
      { id: "b", text: "1/2" },
      { id: "c", text: "2/3" },
      { id: "d", text: "1/6" },
    ],
    correctOptionId: "a",
    explanation: "Числа більше 4: {5, 6} — 2 варіанти з 6. P = 2/6 = 1/3.",
    difficulty: 1,
  },
  {
    topicId: "probability",
    text: "Скільки перестановок можна скласти з 4 елементів?",
    options: [
      { id: "a", text: "24" },
      { id: "b", text: "16" },
      { id: "c", text: "12" },
      { id: "d", text: "8" },
    ],
    correctOptionId: "a",
    explanation: "P(4) = 4! = 4 · 3 · 2 · 1 = 24.",
    difficulty: 2,
  },
  {
    topicId: "probability",
    text: "З 10 квитків 3 щасливі. Яка ймовірність витягнути щасливий?",
    options: [
      { id: "a", text: "0.3" },
      { id: "b", text: "0.7" },
      { id: "c", text: "3" },
      { id: "d", text: "1/3" },
    ],
    correctOptionId: "a",
    explanation: "P = 3/10 = 0.3.",
    difficulty: 1,
  },
  {
    topicId: "probability",
    text: "Скільки розміщень A(5,2) існує?",
    options: [
      { id: "a", text: "20" },
      { id: "b", text: "10" },
      { id: "c", text: "25" },
      { id: "d", text: "5" },
    ],
    correctOptionId: "a",
    explanation: "A(5,2) = 5!/(5−2)! = 5·4 = 20.",
    difficulty: 3,
  },
  {
    topicId: "probability",
    text: "Яка ймовірність протилежної події, якщо P(A) = 0.4?",
    options: [
      { id: "a", text: "0.6" },
      { id: "b", text: "0.4" },
      { id: "c", text: "1.4" },
      { id: "d", text: "0.04" },
    ],
    correctOptionId: "a",
    explanation: "P(Ā) = 1 − P(A) = 1 − 0.4 = 0.6.",
    difficulty: 1,
  },
  // Statistics
  {
    topicId: "statistics",
    text: "Знайдіть середнє арифметичне чисел: 4, 8, 6, 10, 2",
    options: [
      { id: "a", text: "6" },
      { id: "b", text: "8" },
      { id: "c", text: "5" },
      { id: "d", text: "4" },
    ],
    correctOptionId: "a",
    explanation: "Сума = 4 + 8 + 6 + 10 + 2 = 30. Середнє = 30 / 5 = 6.",
    difficulty: 1,
  },
  {
    topicId: "statistics",
    text: "Знайдіть медіану набору: 3, 7, 1, 9, 5",
    options: [
      { id: "a", text: "5" },
      { id: "b", text: "3" },
      { id: "c", text: "7" },
      { id: "d", text: "6" },
    ],
    correctOptionId: "a",
    explanation: "Впорядкуємо: 1, 3, 5, 7, 9. Медіана — середній елемент = 5.",
    difficulty: 1,
  },
  {
    topicId: "statistics",
    text: "Знайдіть розмах ряду: 3, 7, 2, 9, 5",
    options: [
      { id: "a", text: "7" },
      { id: "b", text: "5" },
      { id: "c", text: "9" },
      { id: "d", text: "4" },
    ],
    correctOptionId: "a",
    explanation: "Розмах = max − min = 9 − 2 = 7.",
    difficulty: 1,
  },
  {
    topicId: "statistics",
    text: "Яке значення є модою в наборі: 2, 4, 4, 5, 7, 4, 3?",
    options: [
      { id: "a", text: "4" },
      { id: "b", text: "5" },
      { id: "c", text: "3" },
      { id: "d", text: "7" },
    ],
    correctOptionId: "a",
    explanation: "Мода — найчастіше значення. Число 4 зустрічається 3 рази.",
    difficulty: 1,
  },
  {
    topicId: "statistics",
    text: "Середнє арифметичне 5 чисел дорівнює 8. Яка їхня сума?",
    options: [
      { id: "a", text: "40" },
      { id: "b", text: "13" },
      { id: "c", text: "1.6" },
      { id: "d", text: "45" },
    ],
    correctOptionId: "a",
    explanation: "Сума = середнє · кількість = 8 · 5 = 40.",
    difficulty: 1,
  },
  {
    topicId: "statistics",
    text: "Знайдіть медіану: 10, 3, 7, 1, 5, 9, 2",
    options: [
      { id: "a", text: "5" },
      { id: "b", text: "7" },
      { id: "c", text: "3" },
      { id: "d", text: "6" },
    ],
    correctOptionId: "a",
    explanation:
      "Впорядкуємо: 1, 2, 3, 5, 7, 9, 10. Медіана (4-й елемент) = 5.",
    difficulty: 2,
  },
];
