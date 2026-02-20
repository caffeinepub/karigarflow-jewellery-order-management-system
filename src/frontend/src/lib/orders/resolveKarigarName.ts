import type { PersistentKarigar } from '../../backend';

/**
 * Resolves a karigar name from a karigarId by looking it up in the karigars list.
 * Returns 'Unassigned' if the ID is empty, whitespace-only, null, undefined, or no matching karigar is found.
 */
export function resolveKarigarName(karigarId: string | null | undefined, karigars: PersistentKarigar[]): string {
  // Handle null, undefined, or empty string cases
  if (!karigarId) {
    return 'Unassigned';
  }
  
  const trimmedId = karigarId.trim();
  
  // Handle whitespace-only strings
  if (trimmedId === '') {
    return 'Unassigned';
  }

  // Look up the karigar by ID
  const karigar = karigars.find((k) => k.id === trimmedId);
  return karigar?.name || 'Unassigned';
}
