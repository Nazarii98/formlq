import { SectionLabel } from "@/components/ui/section-label";
import { TextInput } from "@/components/ui/text-field";
import { StepButton } from "./primitives";

const MIN_DURATION = 5;
const MAX_DURATION = 360;

/** Title / subtitle / duration fields of a test. */
export function TestMetaCard({
  title,
  onTitleChange,
  subtitle,
  onSubtitleChange,
  durationMinutes,
  onDurationChange,
  totalPoints,
}: {
  title: string;
  onTitleChange: (v: string) => void;
  subtitle: string;
  onSubtitleChange: (v: string) => void;
  durationMinutes: number;
  onDurationChange: (v: number) => void;
  totalPoints: number;
}) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <SectionLabel as="label" htmlFor="test-title">
            Назва
          </SectionLabel>
          <TextInput
            id="test-title"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Тест 1"
            className="bg-background font-semibold"
          />
        </div>
        <div className="space-y-1">
          <SectionLabel as="label" htmlFor="test-subtitle">
            Підзаголовок
          </SectionLabel>
          <TextInput
            id="test-subtitle"
            value={subtitle}
            onChange={(e) => onSubtitleChange(e.target.value)}
            placeholder="НМТ 2026 · Варіант 1"
            className="bg-background"
          />
        </div>
      </div>
      <div className="space-y-1 w-fit">
        <SectionLabel as="label" htmlFor="test-duration">
          Тривалість (хв)
        </SectionLabel>
        <div className="flex items-center gap-2">
          <StepButton
            aria-label="Зменшити тривалість"
            onClick={() => onDurationChange(Math.max(MIN_DURATION, durationMinutes - 5))}
          >
            −
          </StepButton>
          <TextInput
            id="test-duration"
            size="sm"
            type="number"
            min={MIN_DURATION}
            max={MAX_DURATION}
            value={durationMinutes}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v) && v >= MIN_DURATION) onDurationChange(v);
            }}
            className="w-20 h-9 text-center tabular-nums bg-background"
          />
          <StepButton
            aria-label="Збільшити тривалість"
            onClick={() => onDurationChange(Math.min(MAX_DURATION, durationMinutes + 5))}
          >
            +
          </StepButton>
          <span className="text-xs text-muted-foreground">хв</span>
        </div>
      </div>
      <div className="text-xs text-muted-foreground pt-1">
        Максимум балів:{" "}
        <span className="font-semibold text-foreground">{totalPoints}</span>
      </div>
    </div>
  );
}
