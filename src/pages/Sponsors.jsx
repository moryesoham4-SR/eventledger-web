import * as sponsorsApi from '../api/sponsors'
import { formatMoney } from '../components/StatCard'
import SimpleResourcePage from '../components/SimpleResourcePage'
import RequireActiveEvent from '../components/RequireActiveEvent'
import { useMyRole } from '../hooks/useMyRole'

function SponsorsContent({ eventId }) {
  const { canApproveBudget: canManage, loading } = useMyRole(eventId) // event_admin/finance_head

  if (loading) return <div className="skeleton h-10 rounded-xl w-40" />

  return (
    <SimpleResourcePage
      title="Sponsors"
      fields={[
        { key: 'name', label: 'Sponsor name' },
        { key: 'tier', label: 'Tier (Bronze/Silver/Gold)', required: false },
        { key: 'contact_name', label: 'Contact name', required: false },
        { key: 'contact_email', label: 'Contact email', type: 'email', required: false },
        { key: 'amount', label: 'Amount', type: 'number' },
      ]}
      listFn={() => sponsorsApi.listSponsors(eventId)}
      createFn={(form) =>
        sponsorsApi.createSponsor({
          event_id: Number(eventId),
          name: form.name,
          tier: form.tier || 'Bronze',
          contact_name: form.contact_name || '',
          contact_email: form.contact_email || '',
          amount: form.amount ? Number(form.amount) : 0,
          status: 'confirmed',
        })
      }
      deleteFn={sponsorsApi.deleteSponsor}
      canCreate={canManage}
      canDelete={canManage}
      emptyHint={canManage ? undefined : 'No sponsors yet. Ask an event admin or finance head to add one.'}
      renderItem={(item) => (
        <div>
          <p className="font-medium text-ink text-sm">
            {item.name} <span className="text-xs font-normal text-ink/40">· {item.tier}</span>
          </p>
          <p className="text-xs text-ink/55">
            {formatMoney(item.amount)} · {item.status}
          </p>
        </div>
      )}
    />
  )
}

export default function Sponsors() {
  return <RequireActiveEvent>{(eventId) => <SponsorsContent eventId={eventId} />}</RequireActiveEvent>
}
