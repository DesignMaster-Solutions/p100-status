// Grid primitives for the strict teletext screen.
// Nothing else in the codebase should hardcode 40 or 24.

export const GRID_COLS = 40;
export const GRID_ROWS = 24;

/**
 * Lossy display-alphabet conversion so one character maps to exactly one grid
 * cell. NFKD decomposition, strip combining marks, control chars -> space,
 * any remaining non-ASCII -> '?'. The full original string is preserved
 * separately in page item metadata for an accessible detail view.
 */
export function ascii(text: unknown): string {
  return String(text ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\x00-\x1f\x7f]/g, ' ')
    .replace(/[^\x20-\x7e]/gu, '?');
}

/** One grid row: normalized, hard-truncated to 40 cells, padded to 40. */
export function row(text: unknown): string {
  return ascii(text).slice(0, GRID_COLS).padEnd(GRID_COLS, ' ');
}

/**
 * Validate and pad a page to exactly GRID_ROWS rows of GRID_COLS cells.
 * In tests this throws on any violation so a layout bug fails loudly;
 * it also clamps defensively so production can never emit a malformed grid.
 */
export function padPage(rows: string[]): string[] {
  if (rows.length > GRID_ROWS) {
    throw new Error(`Page has ${rows.length} rows, max ${GRID_ROWS}`);
  }
  const out = rows.map((r) => {
    if (r.length !== GRID_COLS) {
      // Defensive clamp; well-formed callers always pass exact-width rows.
      return r.slice(0, GRID_COLS).padEnd(GRID_COLS, ' ');
    }
    return r;
  });
  while (out.length < GRID_ROWS) out.push(' '.repeat(GRID_COLS));
  return out;
}

/** Wrap normalized text into segments of at most `width` cells (>=1 segment). */
export function wrap(text: string, width: number): string[] {
  const clean = ascii(text) || '';
  if (clean.length === 0) return [''];
  const segments: string[] = [];
  for (let i = 0; i < clean.length; i += width) {
    segments.push(clean.slice(i, i + width));
  }
  return segments;
}
