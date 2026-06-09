/** Shared "new launch" logic for brand × state rows (Sprint I-alt). */

/** A launch is "new" if it happened within the last ~18 months. */
export function newLaunchCutoffYear(now: Date = new Date()): number {
  const d = new Date(now);
  d.setMonth(d.getMonth() - 18);
  return d.getFullYear();
}

/** is_new_launch override wins; otherwise derive from launch_year vs the cutoff. */
export function deriveNewLaunch(
  launchYear: number | null | undefined,
  override: boolean | null | undefined,
  cutoffYear: number = newLaunchCutoffYear(),
): boolean {
  return override ?? (launchYear != null && launchYear >= cutoffYear);
}
