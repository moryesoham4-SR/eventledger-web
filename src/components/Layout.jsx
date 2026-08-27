import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useActiveEvent } from '../context/EventContext'
import * as notificationsApi from '../api/notifications'

const NAV_ITEMS = [
  { path: '/', label: 'Workspace' },
  { path: '/dashboard', label: 'Event Dashboard' },
  { path: '/events', label: 'Events' },
  { path: '/calendar', label: 'Calendar & Tasks' },
  { path: '/budget', label: 'Budget Proposals' },
  { path: '/analytics', label: 'Analytics' },
  { path: '/expenses', label: 'Expenses' },
  { path: '/income', label: 'Income' },
  { path: '/vendors', label: 'Vendors' },
  { path: '/sponsors', label: 'Sponsors' },
  { path: '/departments', label: 'Departments & Work' },
  { path: '/notifications', label: 'Notifications' },
  { path: '/settings', label: 'Settings' },
]
const SUPER_ADMIN_NAV_ITEMS = [{ path: '/users', label: 'Users' }]

export default function Layout() {
  const { user, logout } = useAuth()
  const { events, activeEventId, setActiveEventId } = useActiveEvent()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const navItems = user?.is_super_admin ? [...NAV_ITEMS, ...SUPER_ADMIN_NAV_ITEMS] : NAV_ITEMS

  useEffect(() => {
    const fetchUnread = () => {
      if (activeEventId) {
        notificationsApi.generateAlerts(activeEventId).catch(() => {})
      }
      notificationsApi.getUnreadCount().then((d) => setUnreadCount(d.count)).catch(() => {})
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 5000) // poll every 5s for instant badge updates
    return () => clearInterval(interval)
  }, [location.pathname, activeEventId])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleNavClick = () => setMobileOpen(false)

  const sidebarContent = (
    <>
      <div className="p-5 border-b border-rule/60 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl font-bold gradient-text tracking-tight">EventLedger AI</h1>
            <span className="bg-primary-500/10 text-primary-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-primary-500/20">v2.4</span>
          </div>
          {user && (
            <p className="text-xs text-ink/60 font-medium mt-0.5 truncate max-w-[170px]">
              {user.name || user.email}
            </p>
          )}
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden text-ink/40 hover:text-ink text-xl leading-none px-1"
          aria-label="Close menu"
        >
          ✕
        </button>
      </div>
      <div className="px-5 py-3 border-b border-rule/60 bg-well/30">
        <label className="block text-[11px] font-semibold text-ink/50 uppercase tracking-wider mb-1">
          Active Event
        </label>
        <select
          value={activeEventId || ''}
          onChange={(e) => setActiveEventId(e.target.value)}
          className="w-full border border-rule/80 rounded-lg px-2.5 py-1.5 text-sm bg-card text-ink font-medium focus:ring-2 focus:ring-primary-500/30 transition-all"
        >
          {events.length === 0 && <option value="">No events yet</option>}
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.name}
            </option>
          ))}
        </select>
      </div>

      <nav className="flex-1 overflow-y-auto py-2 space-y-0.5 px-3">
        {navItems.map((item) => {
          const active = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={handleNavClick}
              className={`relative flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-sm transition-all btn-click ${
                active
                  ? 'text-primary-400 font-semibold bg-primary-500/10 border border-primary-500/20 shadow-xs'
                  : 'text-ink/70 font-medium hover:text-ink hover:bg-well/60'
              }`}
            >
              {active && (
                <span className="h-2 w-2 rounded-full bg-primary-500 animate-pulse" />
              )}
              {item.label}
              {item.path === '/notifications' && unreadCount > 0 && (
                <span className="ml-auto bg-deficit-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 animate-pulse shadow-xs">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t border-rule/60">
        <button
          onClick={handleLogout}
          className="w-full text-sm text-ink/60 hover:text-deficit-500 font-medium text-left px-2 py-1 transition-colors"
        >
          Log out
        </button>
      </div>
    </>
  )

  return (
    <div className="flex flex-col md:flex-row h-screen">
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between bg-card border-b border-rule px-4 py-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="text-ink/70 text-2xl leading-none px-1"
          aria-label="Open menu"
        >
          ☰
        </button>
        <h1 className="font-display text-base font-bold gradient-text">EventLedger AI</h1>
        <div className="w-6" />
      </div>

      {/* Mobile drawer backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          bg-card/95 backdrop-blur-md border-r border-rule/60 flex flex-col
          fixed inset-y-0 left-0 w-64 z-40 transform transition-transform duration-200
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          md:static md:translate-x-0 md:w-64 md:z-auto
        `}
      >
        {sidebarContent}
      </aside>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-paper">
        <div key={location.pathname} className="page-in">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
