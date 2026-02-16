import { classifyBootstrapError, getSafeErrorString } from './bootstrapErrorClassification';

export interface ErrorPresentation {
  friendlyMessage: string;
  rawErrorString: string;
  isStoppedCanister: boolean;
  isNetworkError: boolean;
}

/**
 * Decode URL-encoded error messages to display them properly
 */
function decodeErrorMessage(message: string): string {
  try {
    // Check if the message contains URL-encoded characters
    if (message.includes('%20') || message.includes('%3A')) {
      return decodeURIComponent(message);
    }
    return message;
  } catch {
    // If decoding fails, return original
    return message;
  }
}

/**
 * Present an error to the user with a friendly message and optional technical details.
 * Reuses bootstrap error classification for stopped-canister and network error detection.
 */
export function presentError(error: unknown): ErrorPresentation {
  const rawErrorString = getSafeErrorString(error);
  const decodedError = decodeErrorMessage(rawErrorString);
  const classification = classifyBootstrapError(error);

  let friendlyMessage = 'An unexpected error occurred. Please try again.';

  if (classification.isStoppedCanister) {
    friendlyMessage = classification.userMessage || 'The backend service is currently stopped.';
  } else if (classification.isNetworkError) {
    friendlyMessage = 'Network error. Please check your connection and try again.';
  } else {
    // Try to extract user-friendly messages from backend errors
    const lowerError = decodedError.toLowerCase();
    
    if (lowerError.includes('unauthorized')) {
      friendlyMessage = decodeErrorMessage('You do not have permission to perform this action.');
    } else if (lowerError.includes('blocked') || lowerError.includes('access denied')) {
      friendlyMessage = decodeErrorMessage(decodedError);
    } else if (lowerError.includes('not found')) {
      friendlyMessage = 'The requested resource was not found.';
    } else if (lowerError.includes('invalid')) {
      friendlyMessage = 'Invalid data provided. Please check your input.';
    } else if (lowerError.includes('duplicate')) {
      friendlyMessage = 'This item already exists.';
    } else if (lowerError.includes('actor not available')) {
      friendlyMessage = 'Backend connection not ready. Please wait a moment and try again.';
    } else if (decodedError.includes('batch') && decodedError.includes('failed')) {
      // Extract batch-specific error messages
      friendlyMessage = decodedError;
    } else {
      // Use the raw error if it looks like a user-facing message (not too technical)
      const isTechnical = decodedError.includes('IC0') || 
                          decodedError.includes('canister') ||
                          decodedError.includes('agent') ||
                          decodedError.length > 200;
      
      if (!isTechnical && decodedError.length > 0) {
        friendlyMessage = decodedError;
      }
    }
  }

  return {
    friendlyMessage: decodeErrorMessage(friendlyMessage),
    rawErrorString: decodedError,
    isStoppedCanister: classification.isStoppedCanister,
    isNetworkError: classification.isNetworkError,
  };
}

/**
 * Get a user-friendly message for stopped canister errors, or null if not a stopped canister error.
 */
export function getStoppedCanisterMessage(error: unknown): string | null {
  const classification = classifyBootstrapError(error);
  return classification.isStoppedCanister ? (classification.userMessage || null) : null;
}
