import { useEffect, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts'
import * as eventsApi from '../api/events'
import * as departmentsApi from '../api/departments'
import * as budgetApi from '../api/budget'
import * as expensesApi from '../api/expenses'
import * as incomeApi from '../api/income'
import { formatMoney } from '../components/StatCard'
import RequireActiveEvent from '../components/RequireActiveEvent'
import { useTheme } from '../context/ThemeContext'

const DEPT_COLORS = ['#FF7A00', '#2563EB', '#7C3AED', '#10B981', '#F59E0B', '#F43F5E', '#0EA5E9', '#EC4899']

function useChartTheme() {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  return {
    grid: isLight ? '#E2E8F0' : '#233047',
    text: isLight ? '#64748B' : '#8A94A8',
    tooltipBg: isLight ? '#FFFFFF' : '#162032',
    tooltipBorder: isLight ? '#DFE3EB' : '#233047',
    tooltipText: isLight ? '#171F2A' : '#E7ECF5',
  }
}

function ChartCard({ title, hint, children, empty }) {
  return (
    <div className="bg-card border border-rule rounded-xl p-5">
      <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
      {hint && <p className="text-xs text-ink/50 mb-3">{hint}</p>}
      {empty ? (
        <p className="text-sm text-ink/50 py-10 text-center">Not enough data yet.</p>
      ) : (
        <div className="h-64 mt-2">{children}</div>
      )}
    </div>
  )
}

function money(currency) {
  return (v) => formatMoney(v, currency)
}

function AnalyticsContent({ eventId }) {
  const ct = useChartTheme()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError('')
    Promise.all([
      eventsApi.getEvent(eventId),
      eventsApi.getEventSummary(eventId),
      departmentsApi.listDepartments(eventId),
      budgetApi.listProposals(eventId),
      expensesApi.listActualExpenses(eventId),
      incomeApi.listActualIncome(eventId),
    ])
      .then(([event, summary, departments, proposals, actualExpenses, actualIncome]) => {
        setData({ event, summary, departments, proposals, actualExpenses, actualIncome })
      })
      .catch(() => setError("Couldn't load analytics for this event"))
      .finally(() => setLoading(false))
  }, [eventId])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-72 rounded-xl" />)}
      </div>
    )
  }
  if (error) return <p className="text-deficit-500 text-sm">{error}</p>
  if (!data) return null

  const { event, summary, departments, proposals, actualExpenses, actualIncome } = data
  const currency = event.currency || 'INR'
  const fmt = money(currency)

  // --- Revenue vs Expense ---
  const revenueVsExpense = [
    { name: 'Income', Estimated: summary.est_income, Actual: summary.act_income },
    { name: 'Expense', Estimated: summary.est_expense, Actual: summary.act_expense },
  ]

  // --- Department Spending ---
  const deptSpending = departments
    .map((d) => ({
      name: d.name,
      value: actualExpenses.filter((e) => e.department_id === d.id).reduce((s, e) => s + Number(e.amount || 0), 0),
    }))
    .filter((d) => d.value > 0)

  // --- Budget Burn Rate: cumulative spend over time vs. approved budget ---
  const approvedBudget = proposals.filter((p) => p.status === 'approved').reduce((s, p) => s + Number(p.total_amount || 0), 0)
  const spendByDay = {}
  actualExpenses.forEach((e) => {
    const day = (e.paid_on || e.created_at || '').slice(0, 10)
    if (!day) return
    spendByDay[day] = (spendByDay[day] || 0) + Number(e.amount || 0)
  })
  let cumSpend = 0
  const burnData = Object.keys(spendByDay).sort().map((day) => {
    cumSpend += spendByDay[day]
    return { date: day.slice(5), spent: cumSpend, budget: approvedBudget }
  })

  // --- Profit Trend: cumulative income - cumulative expense over time ---
  const incomeByDay = {}
  actualIncome.forEach((i) => {
    const day = (i.received_on || i.created_at || '').slice(0, 10)
    if (!day) return
    incomeByDay[day] = (incomeByDay[day] || 0) + Number(i.amount || 0)
  })
  const allDays = [...new Set([...Object.keys(spendByDay), ...Object.keys(incomeByDay)])].sort()
  let cumIncome = 0, cumExpense = 0
  const profitData = allDays.map((day) => {
    cumIncome += incomeByDay[day] || 0
    cumExpense += spendByDay[day] || 0
    return { date: day.slice(5), profit: cumIncome - cumExpense }
  })

  // --- Budget Utilization ---
  const used = summary.act_expense || 0
  const remaining = Math.max(approvedBudget - used, 0)
  const utilizationData = approvedBudget > 0
    ? [{ name: 'Used', value: Math.min(used, approvedBudget) }, { name: 'Remaining', value: remaining }]
    : []

  const tooltipStyle = { background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, borderRadius: 8, fontSize: 12 }
  const tooltipLabelStyle = { color: ct.tooltipText, fontWeight: 600, marginBottom: 4 }
  const tooltipItemStyle = { color: ct.tooltipText }

  return (
    <div>
      <h2 className="font-display text-2xl font-semibold text-ink mb-1">Analytics</h2>
      <p className="text-sm text-ink/55 mb-6">{event.name}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title="Revenue vs Expense" hint="Estimated vs. actual, side by side">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueVsExpense}>
              <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: ct.text, fontSize: 12 }} axisLine={{ stroke: ct.grid }} tickLine={false} />
              <YAxis tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} width={50} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip formatter={fmt} contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} cursor={{ fill: ct.grid, opacity: 0.3 }} />
              <Legend wrapperStyle={{ fontSize: 12, color: ct.text }} />
              <Bar dataKey="Estimated" fill="#2563EB" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Actual" fill="#FF7A00" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Department Spending" hint="Actual expense by department" empty={deptSpending.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={deptSpending} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {deptSpending.map((_, i) => <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={fmt} contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
              <Legend wrapperStyle={{ fontSize: 12, color: ct.text }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Budget Burn Rate" hint="Cumulative spend vs. approved budget" empty={burnData.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={burnData}>
              <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
              <XAxis dataKey="date" tick={{ fill: ct.text, fontSize: 11 }} axisLine={{ stroke: ct.grid }} tickLine={false} />
              <YAxis tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} width={50} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip formatter={fmt} contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
              {approvedBudget > 0 && <ReferenceLine y={approvedBudget} stroke="#F43F5E" strokeDasharray="4 4" label={{ value: 'Budget', fill: '#F43F5E', fontSize: 11 }} />}
              <Line type="monotone" dataKey="spent" stroke="#FF7A00" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Profit Trend" hint="Cumulative income minus expense over time" empty={profitData.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={profitData}>
              <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
              <XAxis dataKey="date" tick={{ fill: ct.text, fontSize: 11 }} axisLine={{ stroke: ct.grid }} tickLine={false} />
              <YAxis tick={{ fill: ct.text, fontSize: 11 }} axisLine={false} tickLine={false} width={50} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip formatter={fmt} contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
              <ReferenceLine y={0} stroke={ct.grid} />
              <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Budget Utilization" hint="Approved budget used vs. remaining" empty={utilizationData.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={utilizationData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                <Cell fill={used > approvedBudget ? '#F43F5E' : '#FF7A00'} />
                <Cell fill="#64748B" />
              </Pie>
              <Tooltip formatter={fmt} contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
              <Legend wrapperStyle={{ fontSize: 12, color: ct.text }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}

export default function Analytics() {
  return <RequireActiveEvent>{(eventId) => <AnalyticsContent eventId={eventId} />}</RequireActiveEvent>
}
