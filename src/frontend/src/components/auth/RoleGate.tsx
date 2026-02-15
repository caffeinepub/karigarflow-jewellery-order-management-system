import { type ReactNode } from 'react';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { AccessDeniedScreen } from './AccessDeniedScreen';
import { AppRole } from '../../backend';

interface RoleGateProps {
  allowedRoles: AppRole[];
  children: ReactNode;
}

export function RoleGate({ allowedRoles, children }: RoleGateProps) {
  const { userProfile, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!userProfile || !allowedRoles.includes(userProfile.appRole)) {
    return <AccessDeniedScreen />;
  }

  return <>{children}</>;
}
