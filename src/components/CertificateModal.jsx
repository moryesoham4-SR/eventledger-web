import { useState } from 'react'

export default function CertificateModal({ certData, onClose }) {
  const [signatory1, setSignatory1] = useState(certData?.signatory_1?.name || 'Event Director')
  const [signatory2, setSignatory2] = useState(certData?.signatory_2?.name || 'Faculty Advisor')
  const [awardTitle, setAwardTitle] = useState(certData?.award_title || 'Certificate of Appreciation')

  if (!certData) return null

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
      <div className="bg-card border border-rule rounded-2xl p-6 max-w-3xl w-full space-y-5 shadow-2xl my-8">
        <div className="flex items-center justify-between border-b border-rule pb-3 print:hidden">
          <h3 className="font-display text-lg font-bold text-ink flex items-center gap-2">
            <span>📜</span> Digital Certificate Generator
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xs flex items-center gap-1.5"
            >
              <span>🖨️</span> Print / Download PDF
            </button>
            <button onClick={onClose} className="text-ink/40 hover:text-ink text-sm font-semibold">✕</button>
          </div>
        </div>

        {/* Certificate Customizer Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-well/40 border border-rule rounded-xl text-xs print:hidden">
          <div>
            <label className="text-ink/60 font-semibold block mb-1">Award Title</label>
            <input
              value={awardTitle}
              onChange={(e) => setAwardTitle(e.target.value)}
              className="w-full bg-well border border-rule rounded px-2.5 py-1 text-xs text-ink font-semibold"
            />
          </div>
          <div>
            <label className="text-ink/60 font-semibold block mb-1">Signatory 1 (Admin)</label>
            <input
              value={signatory1}
              onChange={(e) => setSignatory1(e.target.value)}
              className="w-full bg-well border border-rule rounded px-2.5 py-1 text-xs text-ink"
            />
          </div>
          <div>
            <label className="text-ink/60 font-semibold block mb-1">Signatory 2 (Faculty)</label>
            <input
              value={signatory2}
              onChange={(e) => setSignatory2(e.target.value)}
              className="w-full bg-well border border-rule rounded px-2.5 py-1 text-xs text-ink"
            />
          </div>
        </div>

        {/* Printable Certificate Frame */}
        <div className="p-8 sm:p-12 bg-amber-500/5 border-8 border-amber-500/30 rounded-2xl text-center space-y-6 relative overflow-hidden shadow-inner font-serif print:border-amber-600 print:bg-white print:p-8">
          <div className="absolute top-3 left-3 right-3 bottom-3 border-2 border-amber-500/20 rounded-xl pointer-events-none" />

          {/* Header */}
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-500 font-sans block">
              {certData.organization_name}
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-ink font-serif tracking-wide uppercase">
              {certData.event_title}
            </h2>
            <p className="text-amber-500/80 font-sans text-xs font-bold uppercase tracking-widest pt-2">
              ★ {awardTitle} ★
            </p>
          </div>

          {/* Body */}
          <div className="space-y-3 max-w-lg mx-auto">
            <p className="text-xs text-ink/70 font-sans italic">This certificate is proudly presented to</p>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-ink tracking-tight underline decoration-amber-500/40 underline-offset-8">
              {certData.recipient_name}
            </h1>
            <p className="text-xs font-semibold text-primary-400 font-sans">
              Department: {certData.department_name} ({certData.recipient_role})
            </p>
            <p className="text-xs text-ink/80 leading-relaxed font-sans max-w-md mx-auto pt-2">
              "{certData.citation}"
            </p>
          </div>

          {/* Footer & Signatures */}
          <div className="pt-8 border-t border-amber-500/20 flex items-center justify-between px-4 sm:px-8 font-sans text-xs flex-wrap gap-4">
            <div className="text-center space-y-1">
              <div className="w-32 border-b border-ink/40 pb-1 mx-auto font-serif italic text-ink/80 text-sm">
                {signatory1}
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink/60">{certData.signatory_1?.title || 'Event Director'}</p>
            </div>

            <div className="text-center space-y-0.5">
              <span className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 font-bold flex items-center justify-center text-sm mx-auto">
                🏆
              </span>
              <p className="text-[9px] font-mono text-ink/40">ID: {certData.certificate_id}</p>
            </div>

            <div className="text-center space-y-1">
              <div className="w-32 border-b border-ink/40 pb-1 mx-auto font-serif italic text-ink/80 text-sm">
                {signatory2}
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink/60">{certData.signatory_2?.title || 'Faculty Advisor'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
