/**
 * Radius classes for theme-aware corners (`tokens.css` or the compat file).
 *
 * - Compact single-line rows that should stay pills on a "full" radius theme:
 *   `rounded-lg` (maps to `var(--radius)`).
 * - Menu and nav rows: `rounded-menu-item` (capped).
 * - Controls: `rounded-control` (capped).
 * - Wide or multi-line surfaces (modals, dropdown panels, cards):
 *   `rounded-surface` (clamped) so they do not become ovals.
 */

/** Cards, dialogs, dropdown panels, kanban columns, alerts, calendars. */
export const SURFACE_RADIUS_CLASS = "rounded-surface";

/** Inputs, textareas, selects, input groups. */
export const CONTROL_RADIUS_CLASS = "rounded-control";
