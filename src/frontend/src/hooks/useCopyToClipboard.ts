import { useState } from 'react';

export type CopyStatus = 'idle' | 'success' | 'error';

export interface UseCopyToClipboardResult {
  copyStatus: CopyStatus;
  copyToClipboard: (text: string) => Promise<void>;
  getButtonLabel: () => string;
}

/**
 * Hook to copy text to clipboard with user-friendly status labels.
 */
export function useCopyToClipboard(): UseCopyToClipboardResult {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus('success');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      setCopyStatus('error');
      setTimeout(() => setCopyStatus('idle'), 3000);
    }
  };

  const getButtonLabel = (): string => {
    switch (copyStatus) {
      case 'success':
        return 'Copied';
      case 'error':
        return 'Failed to copy';
      default:
        return 'Copy error details';
    }
  };

  return {
    copyStatus,
    copyToClipboard,
    getButtonLabel,
  };
}
