export function Stars({ rating, className = "" }: { rating: number; className?: string }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <span className={`whitespace-nowrap tracking-tight text-accent ${className}`} aria-label={`${rating} sur 5`}>
      {"★".repeat(full)}
      {half && "½"}
    </span>
  );
}
