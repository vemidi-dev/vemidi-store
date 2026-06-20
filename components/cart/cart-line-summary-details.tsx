import { formatEur } from "@/lib/format-eur";
import { resolveCartLineSummaryRows } from "@/lib/cart/cart-line-summary";
import type { CartLine } from "@/lib/cart-types";

type CartLineSummaryDetailsProps = {
  line: CartLine;
  showPricing?: boolean;
  className?: string;
};

export function CartLineSummaryDetails({
  line,
  showPricing = false,
  className = "",
}: CartLineSummaryDetailsProps) {
  const rows = resolveCartLineSummaryRows(line);
  const lineTotal = line.price * line.quantity;

  return (
    <div className={`space-y-1 text-xs text-boutique-muted ${className}`.trim()}>
      {rows.map((row) => (
        <p key={`${line.lineId}-${row.label}-${row.value}`}>
          <span className="text-boutique-ink/80">{row.label}:</span> {row.value}
        </p>
      ))}
      <p>
        <span className="text-boutique-ink/80">Количество:</span> {line.quantity}
      </p>
      {showPricing ? (
        <>
          <p>
            <span className="text-boutique-ink/80">Единична цена:</span>{" "}
            {formatEur(line.price)}
          </p>
          <p>
            <span className="text-boutique-ink/80">Крайна цена:</span>{" "}
            {formatEur(lineTotal)}
          </p>
        </>
      ) : null}
    </div>
  );
}
