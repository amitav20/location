import { useMemo } from 'react';
import type { Business, Permission, StaffRole } from '../types';

export const ROLE_DEFAULT_PERMISSIONS: Record<StaffRole, Permission[]> = {
  owner: [
    'manage',
    'staff',
    'finance',
    'ads',
    'settings',
    'catalog',
    'offers',
    'marketing',
    'reviews',
    'chat',
    'customers',
    'analytics',
    'refunds',
    'deliveries',
    'orders',
    'scan',
    'bookings',
    'kitchen',
    'deliver',
  ],
  manager: [
    'settings',
    'catalog',
    'offers',
    'marketing',
    'reviews',
    'chat',
    'customers',
    'analytics',
    'refunds',
    'deliveries',
    'orders',
    'scan',
    'bookings',
    'kitchen',
    'deliver',
  ],
  cashier: ['orders', 'scan', 'bookings'],
  kitchen: ['kitchen'],
  driver: ['deliver'],
};

export interface UsePermissionsResult {
  role: StaffRole | null;
  permissions: Permission[];
  isOwner: boolean;
  isStaff: boolean;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
}

export function usePermissions(business?: Business | null): UsePermissionsResult {
  return useMemo(() => {
    if (!business) {
      return {
        role: null,
        permissions: [],
        isOwner: false,
        isStaff: false,
        hasPermission: () => false,
        hasAnyPermission: () => false,
        hasAllPermissions: () => false,
      };
    }

    const role = business.myRole || (business.isOwner ? 'owner' : null);
    const permissions: Permission[] =
      Array.isArray(business.myPermissions) && business.myPermissions.length > 0
        ? business.myPermissions
        : role && ROLE_DEFAULT_PERMISSIONS[role]
        ? ROLE_DEFAULT_PERMISSIONS[role]
        : [];

    const isOwner = role === 'owner' || !!business.isOwner;
    const isStaff = isOwner || !!role;

    const hasPermission = (perm: Permission): boolean => {
      if (isOwner) return true;
      return permissions.includes(perm);
    };

    const hasAnyPermission = (perms: Permission[]): boolean => {
      if (isOwner) return true;
      return perms.some(p => permissions.includes(p));
    };

    const hasAllPermissions = (perms: Permission[]): boolean => {
      if (isOwner) return true;
      return perms.every(p => permissions.includes(p));
    };

    return {
      role,
      permissions,
      isOwner,
      isStaff,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
    };
  }, [business]);
}
