import { type ReactNode } from 'react';
import { useEffectiveAppRole } from '../../hooks/useEffectiveAppRole';
import { AccessDeniedScreen } from './AccessDeniedScreen';
import { AppRole } from '../../backend';

interface RoleGateProps {
  allowedRoles: AppRole[];
  children: ReactNode;
}

export function RoleGate({ allowedRoles, children }: RoleGateProps) {
  const { effectiveRole, isLoading, isResolved } = useEffectiveAppRole();

  // Only show loading when actively loading and not yet resolved
  if (isLoading && !isResolved) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // If resolved but no role, show access denied
  if (isResolved && !effectiveRole) {
    return <AccessDeniedScreen />;
  }

  // Check role permission
  if (effectiveRole && !allowedRoles.includes(effectiveRole)) {
    return <AccessDeniedScreen />;
  }

  return <>{children}</>;
}
