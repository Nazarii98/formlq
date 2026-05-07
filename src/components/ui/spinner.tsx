import { cn } from "@/lib/utils";

const sizes = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-8 h-8" };

interface SpinnerProps {
  size?: keyof typeof sizes;
  className?: string;
}

export function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <div
      className={cn(
        "rounded-full border-2 border-primary border-t-transparent animate-spin",
        sizes[size],
        className,
      )}
    />
  );
}

export function SpinnerPage({ size = "md" }: { size?: keyof typeof sizes }) {
  return (
    <div className="flex justify-center py-16">
      <Spinner size={size} />
    </div>
  );
}
