import type { PurchasePreview } from '../game/index.ts'
import { money, vol } from './format.ts'

export function PurchasePreviewCard({ preview }: { preview: PurchasePreview }) {
  return (
    <div
      className={`mt-2 border p-2 text-[11px] leading-snug ${
        preview.blockedReason
          ? 'border-[var(--color-danger)]/40 bg-[var(--color-danger)]/5 text-[var(--color-muted)]'
          : 'border-[var(--color-line)] bg-[var(--color-ink)] text-[var(--color-muted)]'
      }`}
    >
      <div className="font-semibold text-[var(--color-text)]">
        {preview.plainLabel}
        {preview.jargon ? (
          <span className="font-normal text-[var(--color-muted)]"> — {preview.jargon}</span>
        ) : null}
      </div>
      <div className="mt-1">{preview.purpose}</div>
      <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5">
        <span>Price</span>
        <span className="num text-[var(--color-amber)]">{money(preview.price)}</span>
        <span>Recurring</span>
        <span className="num">{preview.recurringNote}</span>
        <span>Timing</span>
        <span>{preview.completionTime}</span>
        <span>Sales effect</span>
        <span className="num">
          {preview.expectedSalesDelta > 0
            ? `+${vol(preview.expectedSalesDelta)}/q`
            : preview.expectedSalesDelta === 0
              ? 'No sales change'
              : vol(preview.expectedSalesDelta)}
        </span>
        <span>Cash</span>
        <span className="num">{money(preview.expectedCashDelta)}</span>
      </div>
      <p className="mt-1 text-[var(--color-cyan)]">{preview.effectSummary}</p>
      {preview.blockedReason && (
        <p className="mt-1 text-[var(--color-danger)]">{preview.blockedReason}</p>
      )}
    </div>
  )
}
