import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from '@tanstack/react-router';

export function AccessDeniedScreen() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
        </div>
        <h1 className="mb-2 text-2xl font-bold">Access Denied</h1>
        <p className="mb-6 text-muted-foreground">
          You don't have permission to access this page. Please contact your administrator if you believe this is an error.
        </p>
        <Button onClick={() => navigate({ to: '/' })}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
