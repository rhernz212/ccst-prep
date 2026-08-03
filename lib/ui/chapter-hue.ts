/**
 * Maps a chapter (or any 1-based index) onto one of the ten `--color-hue-*`
 * tokens, so a chapter carries the same colour everywhere it appears — the
 * study grid, the quiz grid, the chapter nav.
 *
 * The ten hues are authored at matched OKLCH lightness and chroma, which is
 * what stops chapter 5 from shouting louder than chapter 2 in a grid of
 * otherwise identical cards.
 */
export const HUE_COUNT = 10;

export function chapterHue(n: number, lightnessScale = 1): string {
  const index = ((n - 1) % HUE_COUNT + HUE_COUNT) % HUE_COUNT;
  const token = `var(--color-hue-${index + 1})`;

  if (lightnessScale === 1) return token;

  // Lightens or darkens the token for the second stop of a gradient without
  // needing a second set of hand-authored values.
  return lightnessScale > 1
    ? `color-mix(in oklab, white ${Math.round((lightnessScale - 1) * 100)}%, ${token})`
    : `color-mix(in oklab, black ${Math.round((1 - lightnessScale) * 100)}%, ${token})`;
}
