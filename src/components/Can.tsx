import React from 'react';
import type { Business, Permission } from '../types';
import { usePermissions } from '../utils/permissions';

export interface CanProps {
  permission: Permission | Permission[];
  business?: Business | null;
  match?: 'any' | 'all';
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const Can: React.FC<CanProps> = ({
  permission,
  business,
  match = 'any',
  fallback = null,
  children,
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions(business);

  const allowed = Array.isArray(permission)
    ? match === 'all'
      ? hasAllPermissions(permission)
      : hasAnyPermission(permission)
    : hasPermission(permission);

  if (!allowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
