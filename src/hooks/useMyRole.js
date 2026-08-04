import { useEffect, useState } from 'react'
import * as usersApi from '../api/users'

/**
 * Fetches the current user's permission level on a given event, so pages can
 * show/hide actions (approve budgets, delete departments, etc.) accordingly.
 * The backend enforces these independently — this is for UI convenience only.
 *
 * Returns { level, deptId, canManageDepartments, canApproveBudget, loading }
 */
export function useMyRole(eventId) {
  const [role, setRole] = useState({
    level: null,
    deptId: null,
    canManageDepartments: false,
    canApproveBudget: false,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!eventId) {
      setRole({ level: null, deptId: null, canManageDepartments: false, canApproveBudget: false })
      setLoading(false)
      return
    }
    setLoading(true)
    usersApi
      .getMyRole(eventId)
      .then((data) =>
        setRole({
          level: data.level,
          deptId: data.dept_id,
          canManageDepartments: data.can_manage_departments,
          canApproveBudget: data.can_approve_budget,
        })
      )
      .catch(() =>
        setRole({ level: null, deptId: null, canManageDepartments: false, canApproveBudget: false })
      )
      .finally(() => setLoading(false))
  }, [eventId])

  return { ...role, loading }
}
