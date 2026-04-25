/**
 * Contrast ratio helpers for verifying colour contrast in Playwright tests.
 *
 * axe-core cannot evaluate contrast for elements styled with CSS custom
 * property chains. Use these helpers to compute contrast manually in tests.
 *
 * Usage:
 *   const fgColor = await element.evaluate((el) => getComputedStyle(el).color);
 *   const bgColor = await container.evaluate((el) => getComputedStyle(el).backgroundColor);
 *   const ratio = contrastRatio(fgColor, bgColor);
 *   expect(ratio).toBeGreaterThanOrEqual(4.5);
 *
 * Note: parseColor only handles rgb()/rgba() strings. getComputedStyle
 * returns computed values in this format in modern browsers.
 */

export function parseColor(color: string): {
  r: number;
  g: number;
  b: number;
} {
  const match = color.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/);
  if (!match) throw new Error(`Could not parse color: ${color}`);
  return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]) };
}

export function luminance({
  r,
  g,
  b,
}: {
  r: number;
  g: number;
  b: number;
}): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function contrastRatio(fg: string, bg: string): number {
  const l1 = luminance(parseColor(fg));
  const l2 = luminance(parseColor(bg));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
