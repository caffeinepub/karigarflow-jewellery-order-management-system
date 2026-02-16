import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';

export function BlockedUserScreen() {
  const { clear } = useInternetIdentity();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold">Access Blocked</h1>
          <p className="mt-2 text-muted-foreground">
            Your account has been temporarily blocked
          </p>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Account Blocked</AlertTitle>
          <AlertDescription>
            Your access to this application has been blocked by an administrator. 
            Please contact the system administrator for assistance.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground text-center">
            If you believe this is an error, please reach out to your administrator.
          </p>
          
          <Button 
            onClick={handleLogout}
            variant="outline"
            className="w-full"
          >
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}
