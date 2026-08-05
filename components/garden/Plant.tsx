import type { Species } from "@/lib/domain/garden/garden";

/*
 * One plant, drawn from scratch in SVG.
 *
 * Colours are hard-coded rather than pulled from the theme tokens on purpose:
 * a plant is always standing on its own patch of soil under its own sky, so
 * it's a self-contained scene and doesn't have to restate itself in dark
 * mode. Only the sky behind the bed follows the theme (see GardenScene).
 *
 * Every plant is the same 40×66 box with the soil strip drawn along its
 * bottom edge, so a wrapped row of them tiles into one continuous bed without
 * anything positioned absolutely.
 */

/** Exported so a bed can continue the same ground past its last plant. */
export const SOIL = "oklch(38% 0.045 62)";
export const SOIL_TOP = "oklch(45% 0.05 62)";
/** Height of the soil strip, in both SVG units and CSS pixels — the box is
 *  rendered 1:1, and the bed's band has to line up with it exactly. */
export const SOIL_HEIGHT = 8;

const STEM = "oklch(56% 0.12 148)";
const LEAF = "oklch(63% 0.14 148)";

interface Palette {
  petal: string;
  petalDeep: string;
  core: string;
}

const PALETTES: Record<Species, Palette> = {
  fern: { petal: "oklch(66% 0.15 148)", petalDeep: "oklch(55% 0.13 152)", core: "oklch(72% 0.14 140)" },
  daisy: { petal: "oklch(97% 0.015 95)", petalDeep: "oklch(90% 0.03 95)", core: "oklch(84% 0.15 88)" },
  tulip: { petal: "oklch(69% 0.19 5)", petalDeep: "oklch(57% 0.19 10)", core: "oklch(80% 0.12 20)" },
  sunflower: { petal: "oklch(83% 0.15 85)", petalDeep: "oklch(74% 0.16 70)", core: "oklch(40% 0.07 62)" },
  rose: { petal: "oklch(65% 0.19 12)", petalDeep: "oklch(50% 0.16 14)", core: "oklch(78% 0.14 18)" },
  moonflower: {
    petal: "oklch(93% 0.045 300)",
    petalDeep: "oklch(84% 0.07 300)",
    core: "oklch(88% 0.1 95)",
  },
};

/** How high up the box the bloom sits, by stage. */
const BLOOM_Y = [44, 34, 24, 15];
/** Bloom scale by stage — stage 0 has no bloom at all, only a sprout. */
const BLOOM_SCALE = [0, 0.55, 0.85, 1.05];

const GROUND_Y = 58;

export interface PlantProps {
  species: Species;
  /** 0 sprout · 1 bud · 2 bloom · 3 full bloom. */
  stage: number;
  /** Lit with a warm halo — planted inside a long streak. */
  inStreak?: boolean;
  /** 0–1, the plant's stable lean. */
  seed?: number;
  className?: string;
}

function Petals({
  count,
  rx,
  ry,
  distance,
  fill,
  stroke,
}: {
  count: number;
  rx: number;
  ry: number;
  distance: number;
  fill: string;
  stroke?: string;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <ellipse
          key={index}
          cx={0}
          cy={-distance}
          rx={rx}
          ry={ry}
          fill={fill}
          stroke={stroke}
          strokeWidth={stroke ? 0.4 : undefined}
          transform={`rotate(${(360 / count) * index})`}
        />
      ))}
    </>
  );
}

function Bloom({ species, palette }: { species: Species; palette: Palette }) {
  switch (species) {
    case "daisy":
      return (
        <>
          <Petals count={9} rx={2.2} ry={5.2} distance={4.6} fill={palette.petal} stroke={palette.petalDeep} />
          <circle r={2.9} fill={palette.core} />
        </>
      );

    case "sunflower":
      return (
        <>
          <Petals count={14} rx={2} ry={6} distance={5.6} fill={palette.petal} />
          <Petals count={7} rx={1.7} ry={5} distance={5} fill={palette.petalDeep} />
          <circle r={4.1} fill={palette.core} />
          <circle r={2.2} fill="oklch(48% 0.08 62)" />
        </>
      );

    case "tulip":
      // A closed cup rather than open petals — the silhouette is the whole
      // point of a tulip, and radiating ellipses read as a daisy.
      return (
        <>
          <path
            d="M-6.4 3.6 C-7.6 -6 -5.4 -11.2 0 -11.2 C5.4 -11.2 7.6 -6 6.4 3.6 Z"
            fill={palette.petal}
          />
          <path
            d="M-6.4 3.6 C-6.9 -3.6 -5.2 -8.4 -1.9 -10.3 C-2.9 -4.3 -3.1 -0.5 -2.6 3.6 Z"
            fill={palette.petalDeep}
          />
          <path
            d="M6.4 3.6 C6.9 -3.6 5.2 -8.4 1.9 -10.3 C2.9 -4.3 3.1 -0.5 2.6 3.6 Z"
            fill={palette.petalDeep}
          />
        </>
      );

    case "rose":
      // Concentric, slightly offset rings — a rose read from directly above.
      return (
        <>
          <Petals count={6} rx={4.2} ry={5.2} distance={4.2} fill={palette.petalDeep} />
          <circle r={5.6} fill={palette.petal} />
          <circle cx={0.6} cy={-0.5} r={3.7} fill={palette.petalDeep} opacity={0.75} />
          <circle cx={-0.4} cy={0.5} r={2} fill={palette.core} />
        </>
      );

    case "moonflower":
      return (
        <>
          {/* The bloom's own moonlight. Flat opacity rather than an SVG
              filter: this renders once per studied day, and a blur filter
              two hundred times over is a real cost for a decoration. */}
          <circle r={10} fill={palette.petal} opacity={0.16} />
          <circle r={7} fill={palette.petal} opacity={0.2} />
          <Petals count={6} rx={3.2} ry={5.6} distance={4.4} fill={palette.petal} />
          <circle r={2.4} fill={palette.core} opacity={0.9} />
        </>
      );

    case "fern":
      // No flower. Fronds curling off a central spine, tallest at the base.
      return (
        <>
          {[0, 1, 2].map((index) => {
            const y = index * 4.4 - 2;
            const length = 7.5 - index * 1.6;
            return (
              <g key={index}>
                <path
                  d={`M0 ${y} Q ${-length * 0.7} ${y - 1.6} ${-length} ${y - 4}`}
                  stroke={palette.petal}
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d={`M0 ${y} Q ${length * 0.7} ${y - 1.6} ${length} ${y - 4}`}
                  stroke={palette.petal}
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  fill="none"
                />
              </g>
            );
          })}
          <path
            d="M0 2 C0 -4 1.4 -6.6 3 -7.4 C1.2 -7.6 -0.6 -6 -1.2 -3.4"
            stroke={palette.petalDeep}
            strokeWidth={2}
            strokeLinecap="round"
            fill="none"
          />
        </>
      );
  }
}

export function Plant({ species, stage, inStreak = false, seed = 0.5, className = "" }: PlantProps) {
  const palette = PALETTES[species];
  const bloomY = BLOOM_Y[stage] ?? BLOOM_Y[0];
  const scale = BLOOM_SCALE[stage] ?? 0;
  // ±3px of lean, and a hair of side-to-side placement, so a bed of forty
  // plants doesn't read as a bar chart.
  const lean = (seed - 0.5) * 6;
  const shift = (seed - 0.5) * 3;
  const stemX = 20 + shift;
  const topX = stemX + lean;

  return (
    <svg
      viewBox="0 0 40 66"
      className={`h-[66px] w-10 shrink-0 ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      {/* Drawn slightly wider than the box so adjacent plants tile without a
          seam at the join, and continued past the last plant by the bed's own
          ground band. */}
      <rect x={-1} y={GROUND_Y} width={42} height={SOIL_HEIGHT} fill={SOIL} />
      <rect x={-1} y={GROUND_Y} width={42} height={1.6} fill={SOIL_TOP} />

      {inStreak && (
        <circle cx={topX} cy={bloomY} r={13} fill="oklch(80% 0.15 85)" opacity={0.14} />
      )}

      <path
        d={`M${stemX} ${GROUND_Y + 0.5} Q ${stemX + lean * 0.4} ${(GROUND_Y + bloomY) / 2} ${topX} ${bloomY}`}
        stroke={STEM}
        strokeWidth={stage === 0 ? 1.6 : 2}
        strokeLinecap="round"
        fill="none"
      />

      {/* Leaves come in pairs, and a plant only earns the lower pair once it's
          fully grown. */}
      {stage >= 1 && (
        <LeafPair
          x={stemX + lean * 0.45}
          y={GROUND_Y - (GROUND_Y - bloomY) * 0.42}
          size={stage >= 3 ? 1.15 : 0.95}
        />
      )}
      {stage >= 3 && (
        <LeafPair x={stemX + lean * 0.2} y={GROUND_Y - (GROUND_Y - bloomY) * 0.2} size={0.85} />
      )}

      {stage === 0 ? (
        // A sprout: two seed leaves and nothing else, whatever species it
        // would eventually have been.
        <LeafPair x={topX} y={bloomY + 1} size={1} />
      ) : (
        <g transform={`translate(${topX} ${bloomY}) scale(${scale})`}>
          <Bloom species={species} palette={palette} />
        </g>
      )}
    </svg>
  );
}

function LeafPair({ x, y, size }: { x: number; y: number; size: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${size})`}>
      <ellipse cx={-3.6} cy={0} rx={3.6} ry={1.7} fill={LEAF} transform="rotate(-22 -3.6 0)" />
      <ellipse cx={3.6} cy={0} rx={3.6} ry={1.7} fill={LEAF} transform="rotate(22 3.6 0)" />
    </g>
  );
}
