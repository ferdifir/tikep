export function PremiumBadge({ size = "sm" }: { size?: "sm" | "lg" }) {
  const cls = size === "lg" ? "px-2 py-0.5 text-xs" : "px-1.5 py-0.5 text-[10px]"
  return (
    <span className={`${cls} rounded bg-amber-500/20 text-amber-400 font-semibold uppercase tracking-wide`}>
      Premium
    </span>
  )
}
