import { cn } from "../utils/cn";
import { Button } from "./button";

interface PaginationProps {
  total: number;
  page: number;
  onChange: (page: number) => void;
  className?: string;
}

function Pagination({ total, page, onChange, className }: PaginationProps) {
  if (total <= 1) return null;

  return (
    <nav className={cn("flex items-center justify-center gap-1", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page <= 1}
      >
        Previous
      </Button>
      {Array.from({ length: total }, (_, i) => i + 1).map((p) => (
        <Button
          key={p}
          variant={p === page ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(p)}
        >
          {p}
        </Button>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange(Math.min(total, page + 1))}
        disabled={page >= total}
      >
        Next
      </Button>
    </nav>
  );
}

export { Pagination, type PaginationProps };
