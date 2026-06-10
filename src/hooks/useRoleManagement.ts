import { useState, useCallback } from 'react'
import { RoleService, AvailableRole } from '../services/roles'

interface UseRoleManagementProps {
  onSuccess?: (message: string) => void
  onError?: (error: string) => void
}

export function useRoleManagement(props?: UseRoleManagementProps) {
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const toggleRoleAssignment = useCallback(async (
    profileId: string, 
    role: AvailableRole, 
    currentRoles: string[]
  ) => {
    setIsProcessing(true)
    setActionError(null)

    const isAssigned = currentRoles.includes(role)
    
    // Execute service layer orchestration
    const result = isAssigned 
      ? await RoleService.revokeRole(profileId, role)
      : await RoleService.grantRole(profileId, role)

    if (result.success) {
      const message = isAssigned 
        ? `Successfully revoked the "${role}" role.` 
        : `Successfully granted the "${role}" role.`
      props?.onSuccess?.(message)
    } else {
      const errorMessage = result.error || 'Failed to update system access boundaries.'
      setActionError(errorMessage)
      props?.onError?.(errorMessage)
    }

    setIsProcessing(false)
    return result.success
  }, [props])

  return {
    toggleRoleAssignment,
    isProcessing,
    actionError
  }
}