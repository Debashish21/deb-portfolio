// Direct-manipulation carousel: the discs follow a drag or trackpad scroll, then snap to a disc.

export type Sample = { t: number; v: number };

/** Units per second across samples from the last windowMs; 0 if the pointer had come to rest. */
export function velocityOf(samples: Sample[], now: number, windowMs = 100): number {
  const recent = samples.filter((s) => s.t >= now - windowMs);
  if (recent.length < 2) return 0;
  const a = recent[0], b = recent[recent.length - 1];
  return b.t > a.t ? ((b.v - a.v) / (b.t - a.t)) * 1000 : 0;
}

/**
 * Whole discs to move when a drag ends: offset is how far it was dragged (in discs, + = next),
 * velocity its flick speed in discs/second. A fifth of a disc commits; at most three per gesture.
 */
export function snapSteps(offset: number, velocity: number): number {
  const projected = offset + velocity * 0.12;
  if (Math.abs(projected) < 0.2) return 0;
  return Math.sign(projected) * Math.min(3, Math.max(1, Math.round(Math.abs(projected))));
}
