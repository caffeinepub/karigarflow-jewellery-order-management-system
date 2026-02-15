/**
 * Shared helpers for presenting errors to users with friendly messages
 * and optional technical details.
 */

import { classifyBootstrapError, getSafeErrorString, type ErrorClassification } from './bootstrapErrorClassification';

export interface ErrorPresentation {
  friendlyMessage: string;
  rawErrorString: string;
  classification: ErrorClassification;
}

/**
 * Converts any error into a user-friendly presentation with hidden technical details.
 */
export function presentError(error: unknown): ErrorPresentation {
  const classification = classifyBootstrapError(error);
  const rawErrorString = getSafeErrorString(error);

  let friendlyMessage: string;

  if (classification.isStoppedCanister && classification.userMessage) {
    friendlyMessage = classification.userMessage;
  } else if (classification.isNetworkError) {
    friendlyMessage = 'Unable to reach the backend service. Please check your internet connection and try again.';
  } else {
    // Generic fallback for other errors
    friendlyMessage = 'An unexpected error occurred. Please try again or contact support if the problem persists.';
  }

  return {
    friendlyMessage,
    rawErrorString,
    classification,
  };
}

/**
 * Returns a friendly message for stopped-canister errors, or null for other errors.
 * Use this when you want to preserve existing page-specific error messages for non-stopped errors.
 */
export function getStoppedCanisterMessage(error: unknown): string | null {
  const classification = classifyBootstrapError(error);
  
  if (classification.isStoppedCanister && classification.userMessage) {
    return classification.userMessage;
  }
  
  return null;
}
