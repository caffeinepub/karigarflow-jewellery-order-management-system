import { type ReactNode } from 'react';
import { useEffectiveAppRole } from '../../hooks/useEffectiveAppRole';
import { AccessDeniedScreen } from './AccessDeniedScreen';
import { AppRole } from '../../backend';
import { Loader2 } from 'lucide-react';

interface RoleGateProps {
  allowedRoles: AppRole[];
  children: ReactNode;
}

export function RoleGate({ allowedRoles, children }: RoleGateProps) {
  const { effectiveRole, isLoading, isResolved } = useEffectiveAppRole();

  console.log('[RoleGate] State:', {
    isLoading,
    isResolved,
    effectiveRole,
    allowedRoles,
  });

  // Show loading while role is being determined
  if (isLoading || !isResolved) {
    console.log('[RoleGate] Showing loading state');
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // If resolved but no role, show access denied
  if (!effectiveRole) {
    console.log('[RoleGate] No effective role, showing access denied');
    return <AccessDeniedScreen />;
  }

  // Check role permission
  if (!allowedRoles.includes(effectiveRole)) {
    console.log('[RoleGate] Role not allowed, showing access denied. User role:', effectiveRole, 'Allowed:', allowedRoles);
    return <AccessDeniedScreen />;
  }

  console.log('[RoleGate] ✓ Access granted for role:', effectiveRole);
  return <>{children}</>;
}
