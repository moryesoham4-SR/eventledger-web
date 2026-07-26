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
      <div className="p-5 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-primary-700">EventLedger AI</h1>
          {user && <p className="text-xs text-gray-500 mt-1">{user.org_name || user.email}</p>}
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden text-gray-400 hover:text-gray-600 text-xl leading-none px-1"
          aria-label="Close menu"
        >
          ✕
        </button>
      </div>
      <div className="px-5 py-3 border-b border-gray-200">
        <label className="block text-xs font-medium text-gray-500 mb-1">Active Event</label>
        <select
          value={activeEventId || ''}
          onChange={(e) => setActiveEventId(e.target.value)}
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
        >
          {events.length === 0 && <option value="">No events yet</option>}
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.name}
            </option>
          ))}
        </select>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={handleNavClick}
            className={`block px-5 py-2.5 text-sm font-medium ${
              location.pathname === item.path
                ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="w-full text-sm text-gray-600 hover:text-red-600 text-left"
        >
          Log out
        </button>
      </div>
    </>
  )

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50">
      {/* Mobile top bar — only shown below md breakpoint */}
      <div className="md:hidden flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="text-gray-600 text-2xl leading-none px-1"
          aria-label="Open menu"
        >
          ☰
        </button>
        <h1 className="text-base font-bold text-primary-700">EventLedger AI</h1>
        <div className="w-6" /> {/* spacer to balance the hamburger button */}
      </div>

      {/* Mobile drawer backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar: fixed drawer on mobile (slides in), static column on desktop */}
      <aside
        className={`
          bg-white border-r border-gray-200 flex flex-col
          fixed inset-y-0 left-0 w-64 z-40 transform transition-transform duration-200
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          md:static md:translate-x-0 md:w-64 md:z-auto
        `}
      >
        {sidebarContent}
      </aside>

      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  )
}
