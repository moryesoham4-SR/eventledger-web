import * as vendorsApi from '../api/vendors'
import { formatMoney } from '../components/StatCard'
import SimpleResourcePage from '../components/SimpleResourcePage'
import RequireActiveEvent from '../components/RequireActiveEvent'

export default function Vendors() {
  return (
    <RequireActiveEvent>
      {(eventId) => (
        <SimpleResourcePage
          title="Vendors"
          fields={[
            { key: 'name', label: 'Vendor name' },
            { key: 'category', label: 'Category', required: false },
            { key: 'contact_name', label: 'Contact name', required: false },
            { key: 'contact_email', label: 'Contact email', type: 'email', required: false },
            { key: 'contract_value', label: 'Contract value', type: 'number', required: false },
          ]}
          listFn={() => vendorsApi.listVendors(eventId)}
          createFn={(form) =>
            vendorsApi.createVendor({
              event_id: Number(eventId),
              name: form.name,
              category: form.category || 'Other',
              contact_name: form.contact_name || '',
              contact_email: form.contact_email || '',
              contract_value: form.contract_value ? Number(form.contract_value) : 0,
            })
          }
          deleteFn={vendorsApi.deleteVendor}
          renderItem={(item) => (
            <div>
              <p className="font-medium text-gray-900 text-sm">
                {item.name}{' '}
                <span className="text-xs font-normal text-gray-400">· {item.category}</span>
              </p>
              <p className="text-xs text-gray-500">
                {item.contact_name}
                {item.contact_name && item.contact_email ? ' · ' : ''}
                {item.contact_email}
                {item.contract_value ? ` · ${formatMoney(item.contract_value)}` : ''}
              </p>
            </div>
          )}
        />
      )}
    </RequireActiveEvent>
  )
}
