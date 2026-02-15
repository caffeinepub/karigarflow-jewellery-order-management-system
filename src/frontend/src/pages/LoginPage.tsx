import { LoginButton } from '../components/auth/LoginButton';
import { Gem } from 'lucide-react';

export function LoginPage() {
  return (
    <div 
      className="flex min-h-screen items-center justify-center p-4"
      style={{
        backgroundImage: 'url(/assets/generated/karigarflow-pattern.dim_1920x1080.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="w-full max-w-md">
        <div className="rounded-lg border bg-card/95 backdrop-blur p-8 shadow-lg">
          <div className="mb-8 text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-primary/10 p-4">
                <Gem className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h1 className="mb-2 text-3xl font-bold">KarigarFlow</h1>
            <p className="text-muted-foreground">
              Jewellery Order Management System
            </p>
          </div>

          <div className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Sign in to access your dashboard and manage orders
            </p>
            <div className="flex justify-center">
              <LoginButton />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
