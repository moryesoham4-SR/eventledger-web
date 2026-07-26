import * as departmentsApi from '../api/departments'
import SimpleResourcePage from '../components/SimpleResourcePage'
import RequireActiveEvent from '../components/RequireActiveEvent'
import { useMyRole } from '../hooks/useMyRole'

function DepartmentsContent({ eventId }) {
  const { canManageDepartments, loading } = useMyRole(eventId)

  if (loading) return <p className="text-gray-500 text-sm">Loading...</p>

  return (
    <SimpleResourcePage
      title="Departments"
      fields={[
        { key: 'name', label: 'Department name' },
        { key: 'head_name', label: 'Head of department', required: false },
        { key: 'color', label: 'Color (hex, e.g. #6366f1)', required: false },
      ]}
      listFn={() => departmentsApi.listDepartments(eventId)}
      createFn={(form) =>
        departmentsApi.createDepartment({
          event_id: Number(eventId),
          name: form.name,
          head_name: form.head_name || '',
          color: form.color || '#6366f1',
        })
      }
      deleteFn={departmentsApi.deleteDepartment}
      canCreate={canManageDepartments}
      canDelete={canManageDepartments}
      emptyHint={canManageDepartments ? undefined : 'No departments yet. Ask an event admin to add one.'}
      renderItem={(item) => (
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full inline-block"
            style={{ backgroundColor: item.color || '#6366f1' }}
          />
          <span className="font-medium text-gray-900 text-sm">{item.name}</span>
          {item.head_name && <span className="text-xs text-gray-500">— {item.head_name}</span>}
        </div>
      )}
    />
  )
}

export default function Departments() {
  return <RequireActiveEvent>{(eventId) => <DepartmentsContent eventId={eventId} />}</RequireActiveEvent>
}
