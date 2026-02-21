import { normalizeKarigarName } from './normalizeKarigarName';

// Deterministic hash function for consistent color assignment
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Light theme color palette with good contrast
const COLOR_PALETTE = [
  { card: 'bg-blue-100 border-blue-300', badge: 'bg-blue-500 text-white' },
  { card: 'bg-green-100 border-green-300', badge: 'bg-green-500 text-white' },
  { card: 'bg-purple-100 border-purple-300', badge: 'bg-purple-500 text-white' },
  { card: 'bg-pink-100 border-pink-300', badge: 'bg-pink-500 text-white' },
  { card: 'bg-yellow-100 border-yellow-300', badge: 'bg-yellow-600 text-white' },
  { card: 'bg-indigo-100 border-indigo-300', badge: 'bg-indigo-500 text-white' },
  { card: 'bg-red-100 border-red-300', badge: 'bg-red-500 text-white' },
  { card: 'bg-teal-100 border-teal-300', badge: 'bg-teal-500 text-white' },
  { card: 'bg-orange-100 border-orange-300', badge: 'bg-orange-500 text-white' },
  { card: 'bg-cyan-100 border-cyan-300', badge: 'bg-cyan-500 text-white' },
];

export function getKarigarColor(karigarName: string): { card: string; badge: string } {
  const normalized = normalizeKarigarName(karigarName);
  const hash = hashString(normalized);
  const index = hash % COLOR_PALETTE.length;
  return COLOR_PALETTE[index];
}
