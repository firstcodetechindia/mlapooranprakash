/**
 * Shared glassmorphism treatment, expressed entirely as Tailwind utilities
 * rather than a custom CSS class. Every property here (background, border,
 * shadow, backdrop-blur) is one Tailwind also manages through its own
 * utility/@property system — a hand-written `@layer components` rule
 * setting the same properties gets silently dropped or overridden by
 * Tailwind v4's utility layer, which always wins regardless of source
 * order. Keeping this as utilities lets tailwind-merge correctly dedupe
 * it against a component's own bg, shadow, or ring defaults.
 *
 * Used deliberately, not everywhere: chrome layers (nav, header, auth
 * cards) get glass; dense data cards in the dashboard stay solid, since
 * translucent surfaces measurably hurt readability once a screen is full
 * of numbers.
 */
export const glassClasses =
  "bg-[var(--glass-bg)] backdrop-blur-xl backdrop-saturate-150 border border-[var(--glass-border)] shadow-[0_1px_0_0_var(--glass-highlight)_inset,0_8px_32px_-8px_var(--glass-shadow)]";
