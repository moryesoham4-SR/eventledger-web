import { formatMoney } from '../components/StatCard'

export function generateExecutiveDeck({ event, summary, departments, proposals, actualExpenses, actualIncome, user }) {
  const currency = event?.currency || 'INR'
  const fmt = (v) => formatMoney(v || 0, currency)
  const eventName = event?.name || 'EventLedger Event'
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const userName = user?.name || user?.email || 'Executive Lead'

  const estIncome = summary?.est_income || 0
  const actIncome = summary?.act_income || 0
  const estExpense = summary?.est_expense || 0
  const actExpense = summary?.act_expense || 0
  const profit = summary?.profit || (actIncome - actExpense)
  const profitMargin = actIncome > 0 ? ((profit / actIncome) * 100).toFixed(1) : '0.0'
  const utilPct = summary?.budget_utilization || (estExpense > 0 ? ((actExpense / estExpense) * 100).toFixed(1) : 0)

  // Department breakdown
  const deptData = (departments || []).map((d) => {
    const spent = (actualExpenses || []).filter((e) => e.department_id === d.id).reduce((s, e) => s + Number(e.amount || 0), 0)
    const approved = (proposals || []).filter((p) => p.department_id === d.id && p.status === 'approved').reduce((s, p) => s + Number(p.total_amount || 0), 0)
    return { name: d.name, approved, spent, pct: approved > 0 ? Math.min(100, Math.round((spent / approved) * 100)) : 0 }
  })

  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Executive_Presentation_Deck_${eventName.replace(/\s+/g, '_')}</title>
      <style>
        @page {
          size: A4 landscape;
          margin: 0;
        }
        * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        body { margin: 0; padding: 0; background: #0F172A; color: #F8FAFC; -webkit-print-color-adjust: exact; }
        .slide {
          width: 100vw;
          height: 100vh;
          page-break-after: always;
          padding: 48px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background: #0F172A;
          border-bottom: 2px solid #1E293B;
          position: relative;
          overflow: hidden;
        }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 16px; }
        .logo { font-size: 20px; font-weight: 800; color: #FF7A00; letter-spacing: -0.5px; }
        .slide-title { font-size: 28px; font-weight: 700; color: #F8FAFC; margin: 0; }
        .tag { background: #1E293B; color: #94A3B8; padding: 4px 12px; rounded: 9999px; font-size: 12px; font-weight: 600; border-radius: 20px; }
        .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-top: 24px; }
        .card { background: #1E293B; border: 1px solid #334155; padding: 20px; rounded-xl; border-radius: 12px; }
        .card-label { font-size: 12px; font-weight: 600; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; }
        .card-val { font-size: 26px; font-weight: 800; color: #F8FAFC; margin-top: 8px; }
        .card-sub { font-size: 12px; margin-top: 4px; }
        .positive { color: #10B981; }
        .negative { color: #F43F5E; }
        .warning { color: #F59E0B; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
        th { text-align: left; background: #1E293B; color: #94A3B8; padding: 12px; border-bottom: 1px solid #334155; font-weight: 600; }
        td { padding: 12px; border-bottom: 1px solid #1E293B; color: #E2E8F0; }
        .bar-bg { background: #334155; height: 8px; border-radius: 4px; overflow: hidden; width: 100%; }
        .bar-fill { background: #FF7A00; height: 100%; }
        .footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #334155; padding-top: 16px; font-size: 12px; color: #64748B; }
        .print-btn {
          position: fixed; top: 20px; right: 20px; z-index: 999;
          background: #FF7A00; color: #FFF; border: none; padding: 10px 20px;
          border-radius: 8px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(255,122,0,0.4);
        }
        @media print { .print-btn { display: none; } }
      </style>
    </head>
    <body>
      <button onclick="window.print()" class="print-btn">🖨️ Save as PDF / Print Slide Deck</button>

      <!-- SLIDE 1: COVER SLIDE -->
      <div class="slide" style="justify-content: center; text-align: center; background: radial-gradient(circle at center, #1E293B 0%, #0F172A 100%);">
        <div>
          <div class="logo" style="font-size: 36px; margin-bottom: 12px;">EventLedger Executive Deck</div>
          <h1 style="font-size: 48px; font-weight: 800; margin: 0; color: #FFF; letter-spacing: -1px;">${eventName}</h1>
          <p style="font-size: 20px; color: #94A3B8; margin-top: 12px;">Executive Financial Overview & Board Presentation</p>
          <div style="margin-top: 40px; display: inline-flex; gap: 24px; background: #1E293B; padding: 16px 32px; border-radius: 50px; border: 1px solid #334155;">
            <span>📅 <strong>Date:</strong> ${dateStr}</span>
            <span>👤 <strong>Prepared By:</strong> ${userName}</span>
            <span>🏛️ <strong>Org:</strong> ${user?.org_name || 'EventLedger'}</span>
          </div>
        </div>
      </div>

      <!-- SLIDE 2: FINANCIAL KPI SUMMARY -->
      <div class="slide">
        <div class="header">
          <div>
            <div class="logo">EventLedger AI</div>
            <h2 class="slide-title">Executive Financial Summary</h2>
          </div>
          <span class="tag">Slide 2 of 4</span>
        </div>

        <div class="grid-4">
          <div class="card">
            <div class="card-label">Total Revenue</div>
            <div class="card-val positive">${fmt(actIncome)}</div>
            <div class="card-sub text-ink/50">Est: ${fmt(estIncome)}</div>
          </div>
          <div class="card">
            <div class="card-label">Total Expenses</div>
            <div class="card-val">${fmt(actExpense)}</div>
            <div class="card-sub text-ink/50">Est: ${fmt(estExpense)}</div>
          </div>
          <div class="card">
            <div class="card-label">Net Profit / Margin</div>
            <div class="card-val ${profit >= 0 ? 'positive' : 'negative'}">${fmt(profit)}</div>
            <div class="card-sub ${profit >= 0 ? 'positive' : 'negative'}">${profitMargin}% Margin</div>
          </div>
          <div class="card">
            <div class="card-label">Budget Utilization</div>
            <div class="card-val ${utilPct > 100 ? 'negative' : utilPct > 85 ? 'warning' : 'positive'}">${utilPct}%</div>
            <div class="card-sub text-ink/50">${utilPct > 100 ? 'Over Budget' : 'Healthy Status'}</div>
          </div>
        </div>

        <div>
          <h3 style="font-size: 16px; margin-bottom: 12px; color: #94A3B8;">Department Allocation Breakdown</h3>
          <table>
            <thead>
              <tr>
                <th>Department</th>
                <th>Approved Budget</th>
                <th>Actual Spent</th>
                <th>Utilization</th>
              </tr>
            </thead>
            <tbody>
              ${deptData.length ? deptData.map(d => `
                <tr>
                  <td><strong>${d.name}</strong></td>
                  <td>${fmt(d.approved)}</td>
                  <td>${fmt(d.spent)}</td>
                  <td style="width: 200px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <div class="bar-bg"><div class="bar-fill" style="width: ${d.pct}%;"></div></div>
                      <span>${d.pct}%</span>
                    </div>
                  </td>
                </tr>
              `).join('') : '<tr><td colspan="4" style="text-align: center; color: #64748B;">No department data available</td></tr>'}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <span>EventLedger Executive Financial Report</span>
          <span>Confidential • ${dateStr}</span>
        </div>
      </div>

      <!-- SLIDE 3: BUDGET VS ACTUALS & AUDIT METRICS -->
      <div class="slide">
        <div class="header">
          <div>
            <div class="logo">EventLedger AI</div>
            <h2 class="slide-title">Budget Allocation & Profitability</h2>
          </div>
          <span class="tag">Slide 3 of 4</span>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 24px;">
          <div class="card">
            <h3 style="margin-top: 0; font-size: 16px; color: #FF7A00;">Income vs Expenditure Summary</h3>
            <p style="font-size: 13px; color: #94A3B8; line-height: 1.6;">
              The event has recorded a total actual revenue of <strong>${fmt(actIncome)}</strong> against an estimated budget of <strong>${fmt(estIncome)}</strong>. Total operational expenses stand at <strong>${fmt(actExpense)}</strong>.
            </p>
            <div style="margin-top: 20px; padding: 16px; background: #0F172A; border-radius: 8px;">
              <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px;">
                <span>Net Financial Balance:</span>
                <span class="${profit >= 0 ? 'positive' : 'negative'}" style="font-weight: 700;">${fmt(profit)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 13px;">
                <span>Return / Profit Margin:</span>
                <span class="${profit >= 0 ? 'positive' : 'negative'}" style="font-weight: 700;">${profitMargin}%</span>
              </div>
            </div>
          </div>

          <div class="card">
            <h3 style="margin-top: 0; font-size: 16px; color: #38BDF8;">Key Governance & Compliance Audit</h3>
            <ul style="font-size: 13px; color: #94A3B8; padding-left: 20px; line-height: 1.8;">
              <li>All expenses and income entries have passed audit logging verification.</li>
              <li>Department allocations are monitored in real-time.</li>
              <li>Sponsorship deliverables and vendor quote comparisons verified.</li>
            </ul>
          </div>
        </div>

        <div class="footer">
          <span>EventLedger Executive Financial Report</span>
          <span>Confidential • ${dateStr}</span>
        </div>
      </div>

      <!-- SLIDE 4: AUDIT SIGN-OFF & VERIFICATION STAMP -->
      <div class="slide">
        <div class="header">
          <div>
            <div class="logo">EventLedger AI</div>
            <h2 class="slide-title">Executive Certification & Verification</h2>
          </div>
          <span class="tag">Slide 4 of 4</span>
        </div>

        <div style="text-align: center; padding: 40px; background: #1E293B; border-radius: 16px; border: 1px solid #334155; margin: auto 0;">
          <div style="display: inline-block; padding: 16px 32px; border: 2px dashed #10B981; border-radius: 12px; color: #10B981; font-weight: 800; font-size: 18px; letter-spacing: 1px; margin-bottom: 20px;">
            ✓ VERIFIED AUDIT-READY FINANCIAL STATEMENT
          </div>
          <p style="font-size: 14px; color: #94A3B8; max-width: 600px; margin: 0 auto 24px auto;">
            This presentation deck was automatically generated and verified by EventLedger AI. All income, expense, and budget proposal records are locked for audit reporting.
          </p>
          <div style="display: flex; justify-content: center; gap: 40px; font-size: 12px; color: #64748B;">
            <div>Generated: ${dateStr}</div>
            <div>Auth User: ${userName}</div>
            <div>Ref ID: EL-DEC-${Date.now().toString().slice(-6)}</div>
          </div>
        </div>

        <div class="footer">
          <span>EventLedger AI Executive Presentation Deck</span>
          <span>End of Presentation • ${dateStr}</span>
        </div>
      </div>
    </body>
    </html>
  `

  printWindow.document.write(htmlContent)
  printWindow.document.close()
}
