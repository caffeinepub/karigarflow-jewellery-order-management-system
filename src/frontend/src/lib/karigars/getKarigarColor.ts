/**
 * Utility function to assign consistent colors to karigar names
 * Uses a deterministic hash-based approach to ensure the same karigar
 * always gets the same color across the application
 */

const KARIGAR_COLORS = [
  'emerald',
  'amber',
  'rose',
  'blue',
  'violet',
  'orange',
  'cyan',
  'pink',
  'teal',
  'indigo',
  'lime',
  'fuchsia',
] as const;

type KarigarColor = typeof KARIGAR_COLORS[number];

/**
 * Simple hash function to convert a string to a number
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Get a consistent color for a karigar name
 */
export function getKarigarColor(karigarName: string): KarigarColor {
  const hash = hashString(karigarName.toLowerCase().trim());
  const index = hash % KARIGAR_COLORS.length;
  return KARIGAR_COLORS[index];
}

/**
 * Get CSS classes for a karigar card based on their name
 */
export function getKarigarCardClasses(karigarName: string): string {
  const color = getKarigarColor(karigarName);
  return `border-${color}-500 bg-gradient-to-br from-${color}-500 to-${color}-600 text-white shadow-lg hover:shadow-xl`;
}

/**
 * Get CSS classes for a karigar badge/label based on their name
 */
export function getKarigarBadgeClasses(karigarName: string): string {
  const color = getKarigarColor(karigarName);
  return `bg-${color}-100 text-${color}-800 dark:bg-${color}-900/30 dark:text-${color}-300 border-${color}-200 dark:border-${color}-800`;
}
