import { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, LogOut, RefreshCw } from 'lucide-react';
import { presentError } from '@/utils/errorPresentation';
import { ErrorDetailsPanel } from './ErrorDetailsPanel';
import { clearPwaCaches } from '../../pwa/clearPwaCaches';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    console.error('[AppErrorBoundary] Error caught:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[AppErrorBoundary] Component error:', error, errorInfo);
    
    // Check if this is an authentication-related error
    const errorMsg = error.message || String(error);
    if (errorMsg.includes('Unauthorized') || errorMsg.includes('permission') || errorMsg.includes('Actor not available')) {
      console.error('[AppErrorBoundary] Authentication-related error detected');
    }
  }

  handleReload = () => {
    console.log('[AppErrorBoundary] Reloading page...');
    window.location.reload();
  };

  handleLogout = async () => {
    console.log('[AppErrorBoundary] Logging out and clearing session...');
    try {
      // Clear PWA caches before clearing storage
      await clearPwaCaches();
      // Clear local storage and session
      localStorage.clear();
      sessionStorage.clear();
      // Reload to reset state
      window.location.href = '/';
    } catch (error) {
      console.error('[AppErrorBoundary] Logout failed:', error);
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      const presentation = this.state.error ? presentError(this.state.error) : null;

      return (
        <div className="flex min-h-screen items-center justify-center p-8 bg-background">
          <div className="text-center max-w-md">
            <div className="mb-6 flex justify-center">
              <div className="rounded-full bg-destructive/10 p-4">
                <AlertCircle className="h-12 w-12 text-destructive" />
              </div>
            </div>
            <h1 className="mb-2 text-2xl font-bold">Something went wrong</h1>
            <p className="mb-6 text-muted-foreground">
              {presentation?.friendlyMessage || 'An unexpected error occurred. Please try reloading the page or logging out and back in.'}
            </p>

            {presentation && (
              <div className="mb-6">
                <ErrorDetailsPanel rawErrorString={presentation.rawErrorString} />
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={this.handleReload} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Reload Page
              </Button>
              <Button variant="outline" onClick={this.handleLogout} className="gap-2">
                <LogOut className="h-4 w-4" />
                Logout & Clear Session
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
