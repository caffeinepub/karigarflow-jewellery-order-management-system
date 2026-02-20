import type { PersistentKarigar } from '../../backend';

/**
 * Resolves karigar name from karigarId with enhanced null/undefined handling
 * Returns 'Unassigned' for empty, null, undefined, or whitespace-only values
 */
export function resolveKarigarName(karigarId: string | null | undefined, karigars: PersistentKarigar[]): string {
  // Handle null, undefined, empty string, or whitespace-only values
  if (!karigarId || karigarId.trim() === '') {
    return 'Unassigned';
  }

  const trimmedId = karigarId.trim();
  
  // Find karigar by ID
  const karigar = karigars.find(k => k.id === trimmedId);
  
  if (karigar && karigar.name && karigar.name.trim() !== '') {
    return karigar.name;
  }
  
  return 'Unassigned';
}
