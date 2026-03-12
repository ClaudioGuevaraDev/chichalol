import { cn } from "@/lib/utils";

function Progress({
  value,
  className
}: {
  value: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "h-2.5 w-full overflow-hidden rounded-full bg-secondary/80",
        className
      )}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 transition-all"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export { Progress };
