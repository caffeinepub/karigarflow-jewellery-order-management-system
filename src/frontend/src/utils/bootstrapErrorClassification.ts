/**
 * Utility to classify bootstrap errors and provide user-friendly messages.
 */

export interface ErrorClassification {
  isStoppedCanister: boolean;
  userMessage: string | null;
  diagnosticTag: string | null;
  canisterId: string | null;
}

/**
 * Extracts canister ID from error message if present.
 */
function extractCanisterId(errorMessage: string): string | null {
  // Match patterns like "Canister 6wepb-taaaa-aaaan-q2pcq-cai"
  const canisterIdMatch = errorMessage.match(/Canister\s+([a-z0-9-]+)/i);
  if (canisterIdMatch && canisterIdMatch[1]) {
    return canisterIdMatch[1];
  }
  
  // Match patterns like "canister_id": { "__principal__": "6wepb-taaaa-aaaan-q2pcq-cai" }
  const principalMatch = errorMessage.match(/"canister_id"[^}]*"__principal__":\s*"([a-z0-9-]+)"/i);
  if (principalMatch && principalMatch[1]) {
    return principalMatch[1];
  }
  
  return null;
}

/**
 * Checks if an error indicates the backend canister is stopped.
 */
export function isStoppedCanisterError(error: unknown): boolean {
  if (!error) return false;
  
  const errorMessage = error instanceof Error ? error.message : String(error);
  return errorMessage.includes('is stopped') || errorMessage.includes('IC0508');
}

/**
 * Classifies a bootstrap error and returns user-facing message and diagnostic info.
 */
export function classifyBootstrapError(error: unknown): ErrorClassification {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const isStoppedCanister = isStoppedCanisterError(error);
  
  if (isStoppedCanister) {
    const canisterId = extractCanisterId(errorMessage);
    
    let userMessage = 'The backend service is currently stopped. This is a temporary infrastructure issue.';
    
    if (canisterId) {
      userMessage += ` Backend canister: ${canisterId}.`;
    }
    
    userMessage += ' Please try again later or contact the administrator if the problem persists.';
    
    return {
      isStoppedCanister: true,
      userMessage,
      diagnosticTag: '[bootstrap] backend canister stopped',
      canisterId,
    };
  }
  
  return {
    isStoppedCanister: false,
    userMessage: null,
    diagnosticTag: null,
    canisterId: null,
  };
}

/**
 * Returns a safe string representation of an error for logging (no secrets).
 */
export function getSafeErrorString(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
