import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'

const THEMES = [
  { value: 'dark', label: 'Dark', hint: 'Midnight Festival — the default', swatch: ['#0B1220', '#FF7A00'] },
  { value: 'light', label: 'Light', hint: 'Same layout, bright surfaces', swatch: ['#F4F6FA', '#FF7A00'] },
]

export default function Settings() {
  const { theme, setTheme } = useTheme()
  const { user } = useAuth()

  return (
    <div className="max-w-lg">
      <h2 className="font-display text-2xl font-semibold text-ink mb-6">Settings</h2>

      <div className="bg-card border border-rule rounded-xl p-5 mb-6">
        <h3 className="font-display font-semibold text-ink mb-1">Appearance</h3>
        <p className="text-sm text-ink/55 mb-4">Choose how EventLedger AI looks on this device.</p>

        <div className="grid grid-cols-2 gap-3">
          {THEMES.map((t) => {
            const active = theme === t.value
            return (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                className={`text-left rounded-xl border p-3 transition-all ${
                  active ? 'border-primary-500 ring-2 ring-primary-500/30' : 'border-rule hover:border-primary-400'
                }`}
              >
                <div
                  className="h-14 rounded-lg mb-3 flex items-center justify-end p-2"
                  style={{ background: t.swatch[0] }}
                >
                  <span className="w-5 h-5 rounded-full" style={{ background: t.swatch[1] }} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">{t.label}</span>
                  {active && (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-primary-500">Active</span>
                  )}
                </div>
                <p className="text-xs text-ink/50 mt-0.5">{t.hint}</p>
              </button>
            )
          })}
        </div>
      </div>

      <div className="bg-card border border-rule rounded-xl p-5">
        <h3 className="font-display font-semibold text-ink mb-1">Account</h3>
        <p className="text-sm text-ink/70 mt-2">{user?.name}</p>
        <p className="text-xs text-ink/50">{user?.email}</p>
        {user?.org_name && <p className="text-xs text-ink/50 mt-1">{user.org_name}</p>}
      </div>
    </div>
  )
}
