"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { formatTimer } from "@/lib/format";

interface ExamTimerProps {
  /** Countdown length in seconds. Starts on mount. */
  durationSeconds: number;
  /** Freeze the countdown (e.g. while the attempt is being submitted). */
  paused?: boolean;
  /** Called once when the countdown reaches 0. May change between renders. */
  onExpire: () => void;
}

/**
 * Self-contained countdown. Owning the ticking state here means only this
 * component re-renders every second, not the whole exam runner.
 */
export function ExamTimer({ durationSeconds, paused = false, onExpire }: ExamTimerProps) {
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  // The interval only counts down; expiry is handled by the effect below.
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [paused]);

  // Time's up → notify via the latest callback, so it sees the latest answers.
  useEffect(() => {
    if (timeLeft === 0) onExpireRef.current();
  }, [timeLeft]);

  return (
    <span
      className={cn(
        "tabular-nums font-bold text-lg font-mono",
        timeLeft < 600 ? "text-red-500" : timeLeft < 1800 ? "text-amber-500" : "",
      )}
    >
      ⏱ {formatTimer(timeLeft)}
    </span>
  );
}
