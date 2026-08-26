import { useEffect, useState } from 'react'
import { getErrorMessage } from '../api/client'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'

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
  const toast = useToast()
  const { confirm } = useConfirm()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [form, setForm] = useState(Object.fromEntries(fields.map((f) => [f.key, ''])))
  const singular = title.toLowerCase().slice(0, -1)

  const load = async () => {
    setLoading(true)
    try {
      const data = await listFn()
      setItems(Array.isArray(data) ? data : [])
    } catch (err) {
      setItems([])
      setError(`Couldn't load ${title.toLowerCase()}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const safeItems = Array.isArray(items) ? items : []
  const filteredItems = safeItems.filter((item) => {
    if (!item) return false
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return Object.values(item).some(
      (val) => val !== null && val !== undefined && typeof val !== 'object' && String(val).toLowerCase().includes(q)
    )
  })

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await createFn(form)
      setForm(Object.fromEntries(fields.map((f) => [f.key, ''])))
      setShowForm(false)
      load()
      toast.success(`${singular.charAt(0).toUpperCase() + singular.slice(1)} added`)
    } catch (err) {
      toast.error(getErrorMessage(err, `Couldn't add that ${singular}`))
    }
  }

  const handleDelete = async (id) => {
    if (!(await confirm(`Remove this ${singular} for good?`, { danger: true, confirmLabel: 'Remove' }))) return
    try {
      await deleteFn(id)
      load()
      toast.success(`${singular.charAt(0).toUpperCase() + singular.slice(1)} removed`)
    } catch (err) {
      toast.error(getErrorMessage(err, `Couldn't remove this ${singular}`))
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-2xl font-semibold text-ink">{title}</h2>
        {canCreate && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-primary-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-primary-700 active:scale-95 transition-all"
          >
            {showForm ? 'Cancel' : '+ New'}
          </button>
        )}
      </div>

      {error && <div className="mb-4 text-sm text-deficit-600 bg-deficit-50 rounded-lg px-3 py-2.5">{error}</div>}

      {canCreate && showForm && (
        <form onSubmit={handleCreate} className="bg-card border border-rule rounded-xl p-5 mb-6 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {fields.map((f) => (
              <input
                key={f.key}
                type={f.type || 'text'}
                placeholder={f.label}
                required={f.required !== false}
                value={form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                className="bg-well border border-rule rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors"
              />
            ))}
          </div>
          <button
            type="submit"
            className="bg-primary-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-primary-700 active:scale-95 transition-all"
          >
            Save
          </button>
        </form>
      )}

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 skeleton rounded-xl" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-card border border-dashed border-rule rounded-xl p-10 text-center">
          <p className="text-3xl mb-2">🔍</p>
          <p className="text-sm text-ink/60">
            {searchQuery ? `No ${title.toLowerCase()} matching "${searchQuery}"` : (emptyHint || (canCreate ? "Nothing on the books yet — add your first one above." : 'Nothing here yet.'))}
          </p>
        </div>
      ) : (
        <div className="bg-card border border-rule rounded-xl divide-y divide-rule">
          {filteredItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-well/60 transition-colors">
              <div>{renderItem(item)}</div>
              {canDelete && (
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-xs text-deficit-500 hover:text-deficit-600 font-medium"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
