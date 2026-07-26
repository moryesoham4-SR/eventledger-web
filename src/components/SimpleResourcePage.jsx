import { useEffect, useState } from 'react'
import { getErrorMessage } from '../api/client'

/**
 * Generic list + create + delete page for simple resources
 * (vendors, sponsors, departments — flat lists with a name/contact style shape).
 *
 * props:
 *  - title: string
 *  - fields: [{ key, label, type }]  form fields for creation
 *  - listFn, createFn, deleteFn: API functions
 *  - renderItem: (item) => JSX for displaying each row's main content
 *  - canCreate: boolean — hide the "+ New" button/form when false (default true)
 *  - canDelete: boolean — hide the Delete button on every row when false (default true)
 *  - emptyHint: optional override for the "nothing here" message when canCreate is false
 */
export default function SimpleResourcePage({
  title,
  fields,
  listFn,
  createFn,
  deleteFn,
  renderItem,
  canCreate = true,
  canDelete = true,
  emptyHint,
}) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(Object.fromEntries(fields.map((f) => [f.key, ''])))

  const load = async () => {
    setLoading(true)
    try {
      const data = await listFn()
      setItems(data)
    } catch (err) {
      setError(`Failed to load ${title.toLowerCase()}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await createFn(form)
      setForm(Object.fromEntries(fields.map((f) => [f.key, ''])))
      setShowForm(false)
      load()
    } catch (err) {
      setError(getErrorMessage(err, `Failed to create ${title.toLowerCase()}`))
    }
  }

  const handleDelete = async (id) => {
    if (!confirm(`Delete this ${title.toLowerCase().slice(0, -1)}?`)) return
    try {
      await deleteFn(id)
      load()
    } catch (err) {
      setError(getErrorMessage(err, `Failed to delete this ${title.toLowerCase().slice(0, -1)}`))
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        {canCreate && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-primary-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-primary-700"
          >
            {showForm ? 'Cancel' : `+ New`}
          </button>
        )}
      </div>

      {error && <div className="mb-4 text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</div>}

      {canCreate && showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-lg p-5 mb-6 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {fields.map((f) => (
              <input
                key={f.key}
                type={f.type || 'text'}
                placeholder={f.label}
                required={f.required !== false}
                value={form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                className="border border-gray-300 rounded px-3 py-2 text-sm"
              />
            ))}
          </div>
          <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded text-sm font-medium">
            Create
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500 text-sm">
          {emptyHint || (canCreate ? 'Nothing here yet. Create your first one above.' : 'Nothing here yet.')}
        </p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-5 py-3">
              <div>{renderItem(item)}</div>
              {canDelete && (
                <button onClick={() => handleDelete(item.id)} className="text-xs text-red-500 hover:text-red-700">
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
