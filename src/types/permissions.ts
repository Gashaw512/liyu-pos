// src/types/permissions.ts

/**
 * Expanded with enterprise wildcard access tokens.
 */
type BasePermission =
  | 'sales:create'
  | 'sales:view'
  | 'inventory:update'
  | 'reports:view'
  | 'staff:manage';

// Enterprise additive types supporting structural global overrides
export type Permission = 
  | BasePermission 
  | '*'                 // Global Super-Admin override
  | 'sales:*'           // Domain-specific wildcard overrides
  | 'inventory:*'
  | 'reports:*'
  | 'staff:*';
