import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { storeSessionParameter } from '../../utils/urlParams';
import { useQueryClient } from '@tanstack/react-query';
import { Info, CheckCircle } from 'lucide-react';

export function BootstrapAdminPage() {
  const queryClient = useQueryClient();
  const [token, setToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;

    setIsSubmitting(true);
    try {
      storeSessionParameter('caffeineAdminToken', token.trim());
      // Invalidate both actor queries to trigger re-initialization
      await queryClient.invalidateQueries({ queryKey: ['actor'] });
      await queryClient.invalidateQueries({ queryKey: ['safeActor'] });
      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (error) {
      console.error('Bootstrap error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Bootstrap Admin</CardTitle>
          <CardDescription>
            Enter the admin bootstrap token to initialize the first administrator
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              This is a one-time setup. The token is provided by the system administrator and should be kept secure.
            </AlertDescription>
          </Alert>

          {success ? (
            <Alert className="border-green-600 bg-green-50 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                Admin initialized successfully! Redirecting...
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="token">Admin Token</Label>
                <Input
                  id="token"
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Enter bootstrap token"
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting || !token.trim()}>
                {isSubmitting ? 'Initializing...' : 'Initialize Admin'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
