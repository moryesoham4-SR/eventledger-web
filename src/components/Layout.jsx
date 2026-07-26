import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useActiveEvent } from '../context/EventContext'

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard' },
  { path: '/events', label: 'Events' },
  { path: '/budget', label: 'Budget Proposals' },
  { path: '/expenses', label: 'Expenses' },
  { path: '/income', label: 'Income' },
  { path: '/vendors', label: 'Vendors' },
  { path: '/sponsors', label: 'Sponsors' },
  { path: '/departments', label: 'Departments' },
  { path: '/notifications', label: 'Notifications' },
]
const SUPER_ADMIN_NAV_ITEMS = [{ path: '/users', label: 'Users' }]

export default function Layout() {
  const { user, logout } = useAuth()
  const { events, activeEventId, setActiveEventId } = useActiveEvent()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems = user?.is_super_admin ? [...NAV_ITEMS, ...SUPER_ADMIN_NAV_ITEMS] : NAV_ITEMS

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleNavClick = () => setMobileOpen(false)

  const sidebarContent = (
    <>
      <div className="p-5 border-b border-rule flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink">EventLedger</h1>
          {user && <p className="text-xs text-ink/50 mt-1">{user.org_name || user.email}</p>}
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden text-ink/40 hover:text-ink text-xl leading-none px-1"
          aria-label="Close menu"
        >
          ✕
        </button>
      </div>
      <div className="px-5 py-3 border-b border-rule">
        <label className="block text-[11px] font-semibold text-ink/50 uppercase tracking-wider mb-1">
          Active Event
        </label>
        <select
          value={activeEventId || ''}
          onChange={(e) => setActiveEventId(e.target.value)}
          className="w-full border border-rule rounded px-2 py-1.5 text-sm bg-well text-ink"
        >
          {events.length === 0 && <option value="">No events yet</option>}
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.name}
            </option>
          ))}
        </select>
      </div>
      <nav className="flex-1 overflow-y-auto py-3">
        {navItems.map((item) => {
          const active = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={handleNavClick}
              className={`relative flex items-center gap-2.5 px-5 py-2.5 text-sm transition-colors ${
                active ? 'text-primary-500 font-semibold bg-well' : 'text-ink/60 font-medium hover:text-ink hover:bg-well/50'
              }`}
            >
              {/* Ledger-spine tick mark instead of a filled highlight block */}
              <span
                className={`absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-r ${
                  active ? 'bg-primary-500' : 'bg-transparent'
                }`}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t border-rule">
        <button
          onClick={handleLogout}
          className="w-full text-sm text-ink/60 hover:text-deficit-500 text-left"
        >
          Log out
        </button>
      </div>
    </>
  )

  return (
    <div className="flex flex-col md:flex-row h-screen">
      {/* Mobile top bar — only shown below md breakpoint */}
      <div className="md:hidden flex items-center justify-between bg-card border-b border-rule px-4 py-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="text-ink/70 text-2xl leading-none px-1"
          aria-label="Open menu"
        >
          ☰
        </button>
        <h1 className="font-display text-base font-semibold text-ink">EventLedger</h1>
        <div className="w-6" /> {/* spacer to balance the hamburger button */}
      </div>

      {/* Mobile drawer backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-ink/40 z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar: fixed drawer on mobile (slides in), static column on desktop */}
      <aside
        className={`
          bg-card border-r border-rule flex flex-col
          fixed inset-y-0 left-0 w-64 z-40 transform transition-transform duration-200
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          md:static md:translate-x-0 md:w-64 md:z-auto
        `}
      >
        {sidebarContent}
      </aside>

      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div key={location.pathname} className="page-in">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
