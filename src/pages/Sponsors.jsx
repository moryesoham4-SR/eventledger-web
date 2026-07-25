import * as sponsorsApi from '../api/sponsors'
import { formatMoney } from '../components/StatCard'
import SimpleResourcePage from '../components/SimpleResourcePage'
import RequireActiveEvent from '../components/RequireActiveEvent'

export default function Sponsors() {
  return (
    <RequireActiveEvent>
      {(eventId) => (
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
          renderItem={(item) => (
            <div>
              <p className="font-medium text-gray-900 text-sm">
                {item.name} <span className="text-xs font-normal text-gray-400">· {item.tier}</span>
              </p>
              <p className="text-xs text-gray-500">
                {formatMoney(item.amount)} · {item.status}
              </p>
            </div>
          )}
        />
      )}
    </RequireActiveEvent>
  )
}
