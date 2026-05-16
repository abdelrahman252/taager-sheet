"use client"
import { useState, useCallback, useRef } from "react"
import { Upload, FileSpreadsheet, Download, TrendingUp, Package, Truck, Globe, Pencil } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts"
import type { SKUResult } from "@/lib/taager"
import { translations, type Lang } from "@/lib/i18n"

export default function Dashboard() {
  const [lang, setLang] = useState<Lang>("en")
  const t = translations[lang]
  const isAr = lang === "ar"

  const [results, setResults] = useState<SKUResult[]>([])
  const [spentValues, setSpentValues] = useState<Record<string, string>>({})
  const [productNames, setProductNames] = useState<Record<string, string>>({})
  const [analysisDayEnd, setAnalysisDayEnd] = useState(9)
  const [closedCycleDayEnd, setClosedCycleDayEnd] = useState(5)
  const [loading, setLoading] = useState(false)
  const [fileName, setFileName] = useState("")
  const [sheetOwnerName, setSheetOwnerName] = useState("")
  const [error, setError] = useState("")
  const fileRef = useRef<File | null>(null)

  const processFile = useCallback(async (file: File) => {
    setLoading(true)
    setError("")
    fileRef.current = file
    setFileName(file.name)
    const baseName = file.name.replace(/\.[^/.]+$/, "")
    setSheetOwnerName(baseName)
    try {
      const XLSX = await import("xlsx")
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: "array", cellDates: true })
      ;(wb as any).__utils = XLSX.utils
      const { parseSheet } = await import("@/lib/taager")
      const data = parseSheet(wb, { analysisDayEnd, closedCycleDayEnd })
      setResults(data)
      const names: Record<string, string> = {}
      data.forEach(r => { names[r.sku] = r.sku })
      setProductNames(names)
    } catch (e: any) {
      setError(t.parseError + e.message)
    }
    setLoading(false)
  }, [analysisDayEnd, closedCycleDayEnd, t])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }, [processFile])

  const handleReprocess = useCallback(async () => {
    if (fileRef.current) processFile(fileRef.current)
  }, [processFile])

  const handleDownload = useCallback(async () => {
    const { exportToXlsx } = await import("@/lib/taager")
    exportToXlsx(results, spentValues, productNames, sheetOwnerName, analysisDayEnd, closedCycleDayEnd)
  }, [results, spentValues, productNames, sheetOwnerName, analysisDayEnd, closedCycleDayEnd])

  const totalOrders = results.reduce((s, r) => s + r.totalOrders, 0)
  const totalDelivered = results.reduce((s, r) => s + r.delivered, 0)
  const avgNdr = results.length ? results.reduce((s, r) => s + r.ndr, 0) / results.length : 0
  const topSku = results[0]

  // Chart: ALL SKUs, short label = last 8 chars (unique suffix)
  const chartData = results.map(r => ({
    sku: r.sku.replace(/^SA\d+/, "").slice(0, 10) || r.sku.slice(-8),
    fullSku: r.sku,
    ndr: r.ndr,
    expectedNdr: r.expectedNdr,
  }))

  // Dynamic column headers with day ranges
  const colNdrDynamic = `NDR% 1–${analysisDayEnd}`
  const colExpNdrDynamic = `Exp.NDR% (Day 1–${closedCycleDayEnd})`

  return (
    <div className="min-h-screen bg-bg grid-noise" dir={t.dir}>
      <header className="border-b border-border px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">{t.appName}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLang(l => l === "en" ? "ar" : "en")}
            className="flex items-center gap-2 border border-border hover:border-accent text-muted hover:text-white px-3 py-2 rounded-lg text-sm transition-colors"
          >
            <Globe className="w-4 h-4" />
            <span className="font-mono">{lang === "en" ? "عربي" : "EN"}</span>
          </button>
          {results.length > 0 && (
            <button onClick={handleDownload} className="flex items-center gap-2 bg-accent hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <Download className="w-4 h-4" />
              {t.downloadSheet}
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-10">

        {/* Upload */}
        <section className="fade-up fade-up-1">
          <h1 className="font-display text-3xl font-bold mb-2">{t.pageTitle}</h1>
          <p className="text-muted text-sm mb-6">{t.tagline}</p>

          <div className={`flex flex-wrap gap-4 mb-4 ${isAr ? "flex-row-reverse" : ""}`}>
            {/* Analysis range pill */}
            <div className="flex items-center gap-2 bg-surface border border-border rounded-lg px-4 py-2">
              <div>
                <p className="text-muted text-xs mb-0.5">{t.analysisRangeLabel}</p>
                <div className="flex items-center gap-1">
                  <span className="text-white text-sm font-mono">Days 1 –</span>
                  <input type="number" min={1} max={31} value={analysisDayEnd}
                    onChange={e => setAnalysisDayEnd(+e.target.value)}
                    className="w-10 bg-transparent text-accent text-sm font-mono text-center outline-none border-b border-accent" />
                </div>
              </div>
            </div>

            {/* Closed cycle pill */}
            <div className="flex items-center gap-2 bg-surface border border-border rounded-lg px-4 py-2">
              <div>
                <p className="text-muted text-xs mb-0.5">{t.closedCycleLabel}</p>
                <div className="flex items-center gap-1">
                  <span className="text-white text-sm font-mono">{t.closedCyclePrefix}</span>
                  <input type="number" min={1} max={31} value={closedCycleDayEnd}
                    onChange={e => setClosedCycleDayEnd(+e.target.value)}
                    className="w-10 bg-transparent text-purple-400 text-sm font-mono text-center outline-none border-b border-purple-400" />
                </div>
              </div>
            </div>

            {fileName && (
              <button onClick={handleReprocess} className="bg-accent-dim hover:opacity-90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-opacity self-end">
                {t.reanalyze}
              </button>
            )}
          </div>

          {/* Sheet owner name */}
          {results.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <Pencil className="w-4 h-4 text-muted" />
              <span className="text-muted text-sm">{t.sheetOwner}:</span>
              <input
                value={sheetOwnerName}
                onChange={e => setSheetOwnerName(e.target.value)}
                placeholder={t.sheetOwnerPlaceholder}
                className="bg-surface border border-border focus:border-accent rounded-lg px-3 py-1.5 text-white text-sm outline-none transition-colors w-48"
              />
            </div>
          )}

          <div onDrop={handleDrop} onDragOver={e => e.preventDefault()}
            className="relative border-2 border-dashed border-border hover:border-accent transition-colors rounded-2xl p-10 text-center cursor-pointer group"
            onClick={() => document.getElementById("fileInput")?.click()}>
            <input id="fileInput" type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileInput} />
            <div className="flex flex-col items-center gap-3">
              {loading
                ? <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                : <FileSpreadsheet className="w-10 h-10 text-muted group-hover:text-accent transition-colors" />}
              <div>
                <p className="text-white font-medium">{fileName || t.dropZoneLabel}</p>
                <p className="text-muted text-sm mt-1">{loading ? t.processing : t.dropZoneOr}</p>
              </div>
            </div>
          </div>
          {error && <p className="text-danger text-sm mt-2">{error}</p>}
        </section>

        {results.length > 0 && (
          <>
            {/* Summary Cards — bigger label */}
            <section className="fade-up fade-up-2">
              <h2 className="font-display text-xl font-semibold mb-4">{t.overview}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={<Package className="w-5 h-5" />} label={t.totalSkus} value={results.length} color="accent" />
                <StatCard icon={<Upload className="w-5 h-5" />} label={t.totalOrders} value={totalOrders.toLocaleString()} color="accent-dim" />
                <StatCard icon={<Truck className="w-5 h-5" />} label={t.totalDelivered} value={totalDelivered.toLocaleString()} color="success" />
                <StatCard icon={<TrendingUp className="w-5 h-5" />} label={t.avgNdr} value={`${avgNdr.toFixed(1)}%`} color="warning" />
              </div>
            </section>

            {/* Top SKU Highlight */}
            {topSku && (
              <section className="fade-up fade-up-2">
                <div className="bg-surface border border-border rounded-2xl p-6 flex flex-wrap gap-6 items-center">
                  <div>
                    <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full font-mono">{t.highestVolume}</span>
                    <p className="font-display text-2xl font-bold mt-2">{topSku.sku}</p>
                    <p className="text-muted text-sm">{topSku.totalOrders} {t.orders}</p>
                  </div>
                  <div className={`flex flex-wrap gap-6 text-sm ${isAr ? "flex-row-reverse" : ""}`}>
                    <Pill label={colNdrDynamic} value={`${topSku.ndr}%`} />
                    <Pill label={colExpNdrDynamic} value={`${topSku.expectedNdr}%`} />
                    <Pill label={t.confirmed} value={topSku.confirmedOrders} />
                    <Pill label={t.avgProfit} value={`${topSku.avgProfit.toFixed(2)} SAR`} />
                  </div>
                </div>
              </section>
            )}

            {/* NDR Chart — fixed: wider per bar, no truncation */}
            <section className="fade-up fade-up-3">
              <h2 className="font-display text-xl font-semibold mb-1">{t.chartTitle}</h2>
              <p className="text-muted text-xs mb-4">
                {t.chartSubtitleOrange} <span className="text-accent font-medium">Days 1–{analysisDayEnd}</span>
                {"  ·  "}
                {t.chartSubtitlePurple} <span className="text-purple-400 font-medium">Days 1–{closedCycleDayEnd}</span>
              </p>
              <div className="bg-surface border border-border rounded-2xl p-6 overflow-x-auto">
                {/* Each SKU gets 90px width minimum so none are cut off */}
                <div style={{ width: Math.max(700, chartData.length * 90), height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} barGap={3} barCategoryGap="30%">
                      <XAxis
                        dataKey="sku"
                        tick={{ fill: "#6B7280", fontSize: 9, fontFamily: "monospace" }}
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                        angle={-35}
                        textAnchor="end"
                        height={55}
                      />
                      <YAxis tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                      <Tooltip
                        contentStyle={{ background: "#12121A", border: "1px solid #1E1E2E", borderRadius: 8, fontSize: 12 }}
                        labelFormatter={(_label: any, payload: any) => payload?.[0]?.payload?.fullSku || _label}
                        formatter={(val: any, name: string) => [`${Number(val).toFixed(1)}%`, name]}
                      />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                      <Bar dataKey="ndr" name={`NDR% 1–${analysisDayEnd}`} fill="#F97316" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expectedNdr" name={`Exp.NDR% 1–${closedCycleDayEnd}`} fill="#7C3AED" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            {/* Preview Table */}
            <section className="fade-up fade-up-4">
              <div className={`flex items-center justify-between mb-4 ${isAr ? "flex-row-reverse" : ""}`}>
                <div>
                  <h2 className="font-display text-xl font-semibold">
                    {sheetOwnerName ? `${sheetOwnerName} — ${t.sheetPreview}` : t.tableTitle}
                  </h2>
                  <p className="text-muted text-sm mt-1">
                    {t.tableSubtitle} <span className="text-accent font-medium">{t.tableSubtitleBold}</span> {t.tableSubtitleEnd}
                  </p>
                </div>
                <button onClick={handleDownload} className="flex items-center gap-2 bg-accent hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors glow-accent">
                  <Download className="w-4 h-4" />
                  {t.exportXlsx}
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="w-full text-sm" dir="ltr">
                  <thead>
                    <tr className="bg-surface border-b border-border">
                      {[
                        t.colSku,
                        t.colProductName,
                        t.colTotalOrders,
                        t.colPlacedNet,
                        t.colConfirmed,
                        t.colDelivered,
                        colNdrDynamic,
                        colExpNdrDynamic,
                        "Net DVL",
                        "Exp. DVL Orders",
                        "CR%",
                        "AVG Profit",
                        t.colSpent,
                        "CPA (USD)",
                        "Breakeven CPA",
                        "Exp. Profit (USD)",
                        "Exp. Net Profit",
                        "Profit",
                        "Net Profit",
                      ].map(h => (
                        <th key={h} className="px-3 py-3 text-left text-muted font-medium whitespace-nowrap text-xs">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => {
                      const spent = parseFloat(spentValues[r.sku] || "0") || 0
                      const cpa = r.placedOrderNet > 0 ? spent / r.placedOrderNet : 0
                      const breakevenCpa = +(r.expectedNdr / 100 * r.avgProfit / 3.75).toFixed(2)
                      const expProfit = +(r.avgProfit * r.expectedDvlOrders / 3.75).toFixed(2)
                      const expNetProfit = +(expProfit - spent).toFixed(2)
                      const profit = +(r.delivered * r.avgProfit / 3.75).toFixed(2)
                      const netProfit = +(profit - spent).toFixed(2)

                      return (
                        <tr key={r.sku} className={`border-b border-border hover:bg-surface/50 transition-colors ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                          <td className="px-3 py-3 font-mono text-xs text-accent whitespace-nowrap">{r.sku}</td>
                          <td className="px-3 py-3">
                            <input
                              value={productNames[r.sku] || ""}
                              onChange={e => setProductNames(prev => ({ ...prev, [r.sku]: e.target.value }))}
                              placeholder={r.sku}
                              className="w-32 bg-bg border border-border focus:border-accent/60 rounded-lg px-2 py-1 text-white text-xs outline-none transition-colors"
                            />
                          </td>
                          <td className="px-3 py-3 text-center font-medium">{r.totalOrders}</td>
                          <td className="px-3 py-3 text-center">{r.placedOrderNet}</td>
                          <td className="px-3 py-3 text-center">{r.confirmedOrders}</td>
                          <td className="px-3 py-3 text-center text-success font-medium">{r.delivered}</td>
                          <td className="px-3 py-3 text-center"><NdrBadge value={r.ndr} /></td>
                          <td className="px-3 py-3 text-center"><NdrBadge value={r.expectedNdr} dim /></td>
                          <td className="px-3 py-3 text-center text-muted">{r.delivered}</td>
                          <td className="px-3 py-3 text-center text-muted">{r.expectedDvlOrders}</td>
                          <td className="px-3 py-3 text-center text-muted">{r.crPercent}%</td>
                          <td className="px-3 py-3 text-center font-medium">{r.avgProfit.toFixed(2)}</td>
                          <td className="px-3 py-3">
                            <input type="number" placeholder="0.00"
                              value={spentValues[r.sku] || ""}
                              onChange={e => setSpentValues(prev => ({ ...prev, [r.sku]: e.target.value }))}
                              className="w-20 bg-bg border border-accent/40 focus:border-accent rounded-lg px-2 py-1.5 text-white text-sm outline-none transition-colors font-mono text-center" />
                          </td>
                          <td className="px-3 py-3 text-center text-muted">{spent ? cpa.toFixed(2) : "—"}</td>
                          <td className="px-3 py-3 text-center text-muted">{breakevenCpa}</td>
                          <td className="px-3 py-3 text-center text-muted">{expProfit}</td>
                          <td className="px-3 py-3 text-center text-muted">{expNetProfit}</td>
                          <td className="px-3 py-3 text-center text-muted">{profit}</td>
                          <td className="px-3 py-3 text-center text-muted">{netProfit}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}

// BIGGER label text: text-sm instead of text-xs
function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: any; color: string }) {
  const colorMap: Record<string, string> = {
    accent: "text-accent bg-accent/10",
    "accent-dim": "text-purple-400 bg-purple-400/10",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
  }
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${colorMap[color]}`}>{icon}</div>
      <p className="text-muted text-sm font-medium mb-1">{label}</p>
      <p className="font-display text-3xl font-bold">{value}</p>
    </div>
  )
}

function Pill({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-muted text-xs">{label}</p>
      <p className="text-white font-semibold">{value}</p>
    </div>
  )
}

function NdrBadge({ value, dim }: { value: number; dim?: boolean }) {
  const color = value >= 30 ? "text-success" : value >= 20 ? "text-warning" : "text-danger"
  return <span className={`font-mono text-xs font-semibold ${dim ? "text-purple-400" : color}`}>{value}%</span>
}
