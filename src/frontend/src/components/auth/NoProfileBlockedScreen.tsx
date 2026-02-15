import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { ShieldAlert, Copy, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export function NoProfileBlockedScreen() {
  const { identity } = useInternetIdentity();
  const [copied, setCopied] = useState(false);
  
  const principalId = identity?.getPrincipal().toString() || '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(principalId);
      setCopied(true);
      toast.success('Principal ID copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
            <ShieldAlert className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <CardTitle className="text-2xl">Access Pending</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertDescription className="text-center">
              Your account has been authenticated, but you don't have a profile yet. 
              Please contact the system administrator to create your profile and assign your role.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">
              Share this Principal ID with the administrator:
            </p>
            <div className="flex gap-2">
              <div className="flex-1 rounded-md border bg-muted p-3 font-mono text-xs break-all">
                {principalId}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="rounded-lg bg-muted p-4 space-y-2">
            <p className="text-sm font-medium">What happens next?</p>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Copy your Principal ID using the button above</li>
              <li>Contact your system administrator</li>
              <li>Provide them with your Principal ID</li>
              <li>Wait for the administrator to create your profile</li>
              <li>Refresh this page once your profile is created</li>
            </ol>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
