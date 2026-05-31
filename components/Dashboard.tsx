"use client"
import { useState, useCallback, useRef } from "react"
import { Upload, FileSpreadsheet, Download, TrendingUp, Package, Truck, Globe, Pencil, Search, X, Info } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts"
import type { SKUResult } from "@/lib/taager"
import { translations, type Lang } from "@/lib/i18n"

/* ─── Column formula definitions ─── */
const colFormulas: Record<string, { en: { label: string; formula: string; desc: string }; ar: { label: string; formula: string; desc: string } }> = {
  colTotalOrders: {
    en: { label: "Total Orders", formula: "Total Orders = All rows for this SKU", desc: "Every order placed for this SKU within the analysis date range" },
    ar: { label: "إجمالي الطلبات", formula: "إجمالي الطلبات = كل الصفوف الخاصة بهذا المنتج", desc: "كل طلب تم وضعه لهذا المنتج في نطاق التاريخ المحدد" },
  },
  colPlacedNet: {
    en: { label: "Placed Net", formula: "Placed Net = Total Orders − Cancelled", desc: "Orders that were not cancelled by the merchant" },
    ar: { label: "صافي الطلبات", formula: "صافي الطلبات = إجمالي الطلبات − الملغية", desc: "الطلبات التي لم يتم إلغاؤها من قِبَل التاجر" },
  },
  colConfirmed: {
    en: { label: "Confirmed", formula: "Confirmed = Placed Net − Delivered", desc: "Orders confirmed but not yet delivered (still in progress)" },
    ar: { label: "الطلبات المؤكدة", formula: "المؤكدة = صافي الطلبات − تم التوصيل", desc: "طلبات مؤكدة ولم يتم توصيلها بعد (قيد التنفيذ)" },
  },
  colDelivered: {
    en: { label: "Delivered", formula: "Delivered = rows where status = 'تم التوصيل'", desc: "Orders with final delivered status" },
    ar: { label: "تم التوصيل", formula: "التوصيل = الصفوف التي حالتها = 'تم التوصيل'", desc: "الطلبات التي وصلت للعميل بالفعل" },
  },
  colNdr: {
    en: { label: "NDR%", formula: "NDR% = Delivered ÷ Placed Net × 100", desc: "Net Delivery Rate — percentage of net orders that were successfully delivered" },
    ar: { label: "NDR%", formula: "NDR% = تم التوصيل ÷ صافي الطلبات × 100", desc: "نسبة التوصيل الفعلية من إجمالي الطلبات الصافية" },
  },
  colExpNdr: {
    en: { label: "Exp. NDR%", formula: "Exp.NDR% = Closed Delivered ÷ Closed Placed Net × 100", desc: "Expected NDR based on fully-closed orders within the closed-cycle date range" },
    ar: { label: "NDR% المتوقع", formula: "NDR% المتوقع = توصيل الدورة المغلقة ÷ صافي الدورة المغلقة × 100", desc: "NDR المتوقع بناءً على الطلبات المكتملة في نطاق الدورة المغلقة" },
  },
  colNetDvl: {
    en: { label: "Net DVL", formula: "Net DVL = round(NDR% × Placed Net ÷ 100)", desc: "Estimated delivered orders based on current NDR rate applied to net orders" },
    ar: { label: "صافي التوصيل", formula: "صافي التوصيل = تقريب(NDR% × صافي الطلبات ÷ 100)", desc: "التوصيل المقدّر بناءً على نسبة NDR الحالية مطبّقةً على الطلبات الصافية" },
  },
  colExpDvl: {
    en: { label: "Exp. DVL", formula: "Exp.DVL = round(Exp.NDR% × Placed Net ÷ 100)", desc: "Expected delivered orders if the expected NDR rate holds for all net orders" },
    ar: { label: "التوصيل المتوقع", formula: "التوصيل المتوقع = تقريب(NDR% المتوقع × صافي الطلبات ÷ 100)", desc: "الطلبات الموصَّلة المتوقعة إذا ثبت معدل NDR المتوقع على الطلبات الصافية" },
  },
  colCr: {
    en: { label: "CR%", formula: "CR% = Confirmed ÷ Placed Net × 100", desc: "Confirmation Rate — percentage of net orders that are confirmed (pending delivery)" },
    ar: { label: "نسبة التأكيد%", formula: "نسبة التأكيد% = المؤكدة ÷ صافي الطلبات × 100", desc: "نسبة الطلبات المؤكدة (في انتظار التوصيل) من الطلبات الصافية" },
  },
  colAvgProfit: {
    en: { label: "AVG Profit", formula: "AVG Profit = (Σ Order Profit − Σ Tax) ÷ Total Orders", desc: "Average profit per order in EGP after deducting tax" },
    ar: { label: "متوسط الربح", formula: "متوسط الربح = (مجموع ربح الطلب − مجموع الضريبة) ÷ إجمالي الطلبات", desc: "متوسط الربح لكل طلب بالجنيه المصري بعد خصم الضريبة" },
  },
  colCpa: {
    en: { label: "CPA (USD)", formula: "CPA = Spent ÷ Placed Net", desc: "Cost Per Acquisition — ad spend divided by net orders placed" },
    ar: { label: "تكلفة الطلب (USD)", formula: "تكلفة الطلب = المنفق ÷ صافي الطلبات", desc: "تكلفة الحصول على طلب = الإنفاق الإعلاني ÷ صافي الطلبات" },
  },
  colBreakevenCpa: {
    en: { label: "Breakeven CPA", formula: "Breakeven CPA = (Exp.NDR% ÷ 100) × AVG Profit ÷ 3.75", desc: "Maximum CPA you can afford without losing money (converts EGP profit to USD at 3.75 rate)" },
    ar: { label: "نقطة التعادل", formula: "نقطة التعادل = (NDR% المتوقع ÷ 100) × متوسط الربح ÷ 3.75", desc: "أقصى تكلفة طلب يمكنك تحملها دون خسارة (يحوّل الربح بالجنيه إلى دولار بسعر 3.75)" },
  },
  colExpProfit: {
    en: { label: "Exp. Profit", formula: "Exp. Profit = AVG Profit × Exp.DVL ÷ 3.75", desc: "Expected total profit in USD based on expected delivered orders" },
    ar: { label: "الربح المتوقع", formula: "الربح المتوقع = متوسط الربح × التوصيل المتوقع ÷ 3.75", desc: "إجمالي الربح المتوقع بالدولار بناءً على الطلبات الموصَّلة المتوقعة" },
  },
  colExpNetProfit: {
    en: { label: "Exp. Net Profit", formula: "Exp. Net Profit = Exp. Profit − Spent", desc: "Expected profit after subtracting ad spend" },
    ar: { label: "صافي الربح المتوقع", formula: "صافي الربح المتوقع = الربح المتوقع − المنفق", desc: "الربح المتوقع بعد خصم الإنفاق الإعلاني" },
  },
  colProfit: {
    en: { label: "Profit", formula: "Profit = AVG Profit × Net DVL ÷ 3.75", desc: "Actual total profit in USD based on current delivered orders" },
    ar: { label: "الربح", formula: "الربح = متوسط الربح × صافي التوصيل ÷ 3.75", desc: "إجمالي الربح الفعلي بالدولار بناءً على الطلبات الموصَّلة الحالية" },
  },
  colNetProfit: {
    en: { label: "Net Profit", formula: "Net Profit = Profit − Spent", desc: "Actual profit after subtracting ad spend" },
    ar: { label: "صافي الربح", formula: "صافي الربح = الربح − المنفق", desc: "الربح الفعلي بعد خصم الإنفاق الإعلاني" },
  },
}

/* ─── FormulaTooltip component ─── */
function FormulaTooltip({ colKey, lang, label }: { colKey: string; lang: Lang; label: string }) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const data = colFormulas[colKey]

  if (!data) return <span className="whitespace-nowrap">{label}</span>

  const info = data[lang]

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setPos({ x: rect.left + rect.width / 2, y: rect.bottom + 6 })
    setVisible(true)
  }

  return (
    <span
      className="group relative inline-flex items-center gap-1 cursor-help whitespace-nowrap"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setVisible(false)}
    >
      {label}
      <Info className="w-3 h-3 text-muted/60 group-hover:text-accent transition-colors shrink-0" />
      {visible && pos && (
        <div
          className="formula-tooltip"
          style={{
            position: "fixed",
            left: pos.x,
            top: pos.y,
            transform: "translateX(-50%)",
            zIndex: 9999,
          }}
          dir={lang === "ar" ? "rtl" : "ltr"}
        >
          {/* Arrow */}
          <div className="formula-tooltip-arrow" />
          <div className="formula-tooltip-label">{info.label}</div>
          <div className="formula-tooltip-formula">{info.formula}</div>
          <div className="formula-tooltip-desc">{info.desc}</div>
        </div>
      )}
    </span>
  )
}

/* ─── Main Dashboard ─── */
export default function Dashboard() {
  const [lang, setLang] = useState<Lang>("en")
  const [darkMode, setDarkMode] = useState(true)
  const t = translations[lang]
  const isAr = lang === "ar"

  const [results, setResults] = useState<SKUResult[]>([])
  const [spentValues, setSpentValues] = useState<Record<string, string>>({})
  const [productNames, setProductNames] = useState<Record<string, string>>({})
  const [analysisDayStart, setAnalysisDayStart] = useState(1)
  const [analysisDayEnd, setAnalysisDayEnd] = useState(9)
  const [closedCycleDayStart, setClosedCycleDayStart] = useState(1)
  const [closedCycleDayEnd, setClosedCycleDayEnd] = useState(5)
  const [skuSearch, setSkuSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [fileName, setFileName] = useState("")
  const [sheetOwnerName, setSheetOwnerName] = useState("")
  const [error, setError] = useState("")
  const fileRef = useRef<File | null>(null)

  const processFile = useCallback(async (file: File) => {
    setLoading(true)
    setError("")
    try {
      const XLSX = await import("xlsx")
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: "array", cellDates: true })
      ;(wb as any).__utils = XLSX.utils
      const { parseSheet } = await import("@/lib/taager")
      const data = parseSheet(wb, { analysisDayStart, analysisDayEnd, closedCycleDayStart, closedCycleDayEnd })
      setResults(data)
      const names: Record<string, string> = {}
      data.forEach(r => { names[r.sku] = r.sku })
      setProductNames(names)
    } catch (e: any) {
      setError(t.parseError + e.message)
    }
    setLoading(false)
  }, [analysisDayStart, analysisDayEnd, closedCycleDayStart, closedCycleDayEnd, t])

  const storeFile = useCallback((file: File) => {
    fileRef.current = file
    setFileName(file.name)
    const baseName = file.name.replace(/\.[^/.]+$/, "")
    setSheetOwnerName(baseName)
    setResults([])
    setError("")
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) storeFile(file)
  }, [storeFile])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) storeFile(file)
  }, [storeFile])

  const handleAnalyze = useCallback(async () => {
    if (fileRef.current) processFile(fileRef.current)
  }, [processFile])

  const handleDownload = useCallback(async () => {
    const { exportToXlsx } = await import("@/lib/taager")
    exportToXlsx(results, spentValues, productNames, sheetOwnerName, analysisDayStart, analysisDayEnd, closedCycleDayStart, closedCycleDayEnd)
  }, [results, spentValues, productNames, sheetOwnerName, analysisDayStart, analysisDayEnd, closedCycleDayStart, closedCycleDayEnd])

  const totalOrders = results.reduce((s, r) => s + r.totalOrders, 0)
  const totalDelivered = results.reduce((s, r) => s + r.delivered, 0)
  const avgNdr = results.length ? results.reduce((s, r) => s + r.ndr, 0) / results.length : 0
  const topSku = results[0]

  const chartData = [...results]
    .sort((a, b) => b.ndr - a.ndr)
    .map(r => ({
      sku: r.sku,
      fullSku: r.sku,
      ndr: r.ndr,
      expectedNdr: r.expectedNdr,
    }))

  const filteredResults = skuSearch.trim()
    ? results.filter(r => r.sku.toLowerCase().includes(skuSearch.trim().toLowerCase()))
    : results

  const analysisLabel = analysisDayStart === 1 ? `1–${analysisDayEnd}` : `${analysisDayStart}–${analysisDayEnd}`
  const closedLabel = closedCycleDayStart === 1 ? `1–${closedCycleDayEnd}` : `${closedCycleDayStart}–${closedCycleDayEnd}`
  const colNdrDynamic = `NDR% ${analysisLabel}`
  const colExpNdrDynamic = `Exp.NDR% ${closedLabel}`

  // Column headers with their formula keys
  const columns: Array<{ key: string; label: string; noDynamic?: boolean }> = [
    { key: "colSku", label: t.colSku },
    { key: "colProductName", label: t.colProductName },
    { key: "colTotalOrders", label: t.colTotalOrders },
    { key: "colPlacedNet", label: t.colPlacedNet },
    { key: "colConfirmed", label: t.colConfirmed },
    { key: "colDelivered", label: t.colDelivered },
    { key: "colNdr", label: colNdrDynamic },
    { key: "colExpNdr", label: colExpNdrDynamic },
    { key: "colNetDvl", label: t.colNetDvl },
    { key: "colExpDvl", label: t.colExpDvl },
    { key: "colCr", label: t.colCr },
    { key: "colAvgProfit", label: t.colAvgProfit },
    { key: "colSpent", label: t.colSpent },
    { key: "colCpa", label: t.colCpa },
    { key: "colBreakevenCpa", label: t.colBreakevenCpa },
    { key: "colExpProfit", label: t.colExpProfit },
    { key: "colExpNetProfit", label: t.colExpNetProfit },
    { key: "colProfit", label: t.colProfit },
    { key: "colNetProfit", label: t.colNetProfit },
  ]

  return (
    <div className={`min-h-screen grid-noise ${darkMode ? "dark-mode" : "light-mode"}`} dir={t.dir}>

      {/* Inline styles for tooltip + light/dark */}
      <style>{`
        /* ── Dark mode (existing) ── */
        .dark-mode {
          --bg: #0A0A12;
          --surface: #111118;
          --border: #1E1E2E;
          --text: #F0F0F0;
          --muted: #6B7280;
          --accent: #F97316;
          --success: #22C55E;
          --warning: #EAB308;
          --danger: #EF4444;
          --tooltip-bg: #12121A;
          --tooltip-border: #2a2a3e;
          --tooltip-formula: #F97316;
          --tooltip-label: #ffffff;
          --tooltip-desc: #9CA3AF;
          --tooltip-arrow: #12121A;
          background-color: var(--bg);
          color: var(--text);
        }

        /* ── Light mode ── */
        .light-mode {
          --bg: #F8F8FC;
          --surface: #FFFFFF;
          --border: #E2E2EE;
          --text: #111118;
          --muted: #6B7280;
          --accent: #E8600A;
          --success: #16A34A;
          --warning: #CA8A04;
          --danger: #DC2626;
          --tooltip-bg: #FFFFFF;
          --tooltip-border: #E2E2EE;
          --tooltip-formula: #E8600A;
          --tooltip-label: #111118;
          --tooltip-desc: #6B7280;
          --tooltip-arrow: #FFFFFF;
          background-color: var(--bg);
          color: var(--text);
        }

        .light-mode .bg-surface { background-color: var(--surface) !important; }
        .light-mode .border-border { border-color: var(--border) !important; }
        .light-mode .text-muted { color: var(--muted) !important; }
        .light-mode .text-white { color: var(--text) !important; }
        .light-mode .bg-bg { background-color: var(--bg) !important; }
        .light-mode header { border-color: var(--border); background-color: var(--surface); }
        .light-mode .hover\\:bg-surface\\/50:hover { background-color: rgba(0,0,0,0.03) !important; }
        .light-mode .bg-white\\/\\[0\\.01\\] { background-color: rgba(0,0,0,0.02) !important; }

        /* ── Tooltip ── */
        .formula-tooltip {
          background: var(--tooltip-bg);
          border: 1.5px solid var(--tooltip-border);
          border-radius: 10px;
          padding: 10px 13px;
          width: 260px;
          min-width: 0;
          max-width: 260px;
          box-sizing: border-box;
          box-shadow: 0 8px 32px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.12);
          pointer-events: none;
          animation: tooltipIn 0.12s ease;
        }
        @keyframes tooltipIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-4px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .formula-tooltip-arrow {
          position: absolute;
          top: -6px;
          left: 50%;
          transform: translateX(-50%);
          width: 10px;
          height: 6px;
          background: var(--tooltip-arrow);
          clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
          border-left: 1.5px solid var(--tooltip-border);
          border-right: 1.5px solid var(--tooltip-border);
        }
        .formula-tooltip-label {
          font-size: 11px;
          font-weight: 700;
          color: var(--tooltip-label);
          margin-bottom: 5px;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          white-space: normal;
          word-break: break-word;
        }
        .formula-tooltip-formula {
          font-size: 11.5px;
          font-family: 'Courier New', Courier, monospace;
          color: var(--tooltip-formula);
          background: color-mix(in srgb, var(--tooltip-formula) 10%, transparent);
          border-radius: 5px;
          padding: 5px 8px;
          margin-bottom: 6px;
          line-height: 1.6;
          white-space: normal;
          word-break: break-word;
          overflow-wrap: break-word;
        }
        .formula-tooltip-desc {
          font-size: 11px;
          color: var(--tooltip-desc);
          line-height: 1.5;
          white-space: normal;
          word-break: break-word;
        }

        /* grid-noise passthrough */
        .grid-noise { position: relative; }

        /* Override table row hover for light mode */
        .light-mode table tr:hover td { background-color: rgba(0,0,0,0.025) !important; }
      `}</style>

      {/* Header */}
      <header className="border-b border-border px-4 sm:px-8 py-4 flex items-center justify-between gap-3 bg-surface">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 shrink-0 rounded-lg bg-accent flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <span className="font-display text-base sm:text-xl font-bold tracking-tight truncate" style={{ color: "var(--text)" }}>{t.appName}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Dark/Light toggle */}
          <button
            onClick={() => setDarkMode(d => !d)}
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className="flex items-center gap-1.5 border border-border hover:border-accent text-muted hover:text-white px-2.5 py-2 rounded-lg text-sm transition-colors"
            style={{ color: "var(--muted)" }}
          >
            <span className="text-base">{darkMode ? "☀️" : "🌙"}</span>
            <span className="font-mono hidden sm:inline text-xs" style={{ color: "var(--muted)" }}>{darkMode ? "Light" : "Dark"}</span>
          </button>

          {/* Language toggle */}
          <button
            onClick={() => setLang(l => l === "en" ? "ar" : "en")}
            className="flex items-center gap-1.5 border border-border hover:border-accent text-muted hover:text-white px-2.5 py-2 rounded-lg text-sm transition-colors"
            style={{ color: "var(--muted)" }}
          >
            <Globe className="w-4 h-4" />
            <span className="font-mono hidden sm:inline">{lang === "en" ? "عربي" : "EN"}</span>
          </button>

          {results.length > 0 && (
            <button onClick={handleDownload} className="flex items-center gap-1.5 bg-accent hover:bg-orange-500 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">{t.downloadSheet}</span>
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8 sm:space-y-10">

        {/* Upload */}
        <section>
          <h1 className="font-display text-2xl sm:text-3xl font-bold mb-1" style={{ color: "var(--text)" }}>{t.pageTitle}</h1>
          <p className="text-muted text-sm mb-5">{t.tagline}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            <div className="bg-surface border border-border rounded-xl px-4 py-3">
              <p className="text-muted text-xs font-medium mb-2 uppercase tracking-wide">{t.analysisRangeLabel}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm shrink-0" style={{ color: "var(--text)" }}>{t.analysisRangeFrom}</span>
                <input type="number" min={1} max={31} value={analysisDayStart}
                  onChange={e => setAnalysisDayStart(Math.min(+e.target.value, analysisDayEnd))}
                  className="w-12 bg-transparent text-accent text-lg font-mono font-bold text-center outline-none border-b-2 border-accent" />
                <span className="text-muted font-mono text-sm shrink-0">{t.analysisRangeTo}</span>
                <input type="number" min={1} max={31} value={analysisDayEnd}
                  onChange={e => setAnalysisDayEnd(Math.max(+e.target.value, analysisDayStart))}
                  className="w-12 bg-transparent text-accent text-lg font-mono font-bold text-center outline-none border-b-2 border-accent" />
              </div>
            </div>

            <div className="bg-surface border border-border rounded-xl px-4 py-3">
              <p className="text-muted text-xs font-medium mb-2 uppercase tracking-wide">{t.closedCycleLabel}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm shrink-0" style={{ color: "var(--text)" }}>{t.closedCycleFrom}</span>
                <input type="number" min={1} max={31} value={closedCycleDayStart}
                  onChange={e => setClosedCycleDayStart(Math.min(+e.target.value, closedCycleDayEnd))}
                  className="w-12 bg-transparent text-purple-400 text-lg font-mono font-bold text-center outline-none border-b-2 border-purple-400" />
                <span className="text-muted font-mono text-sm shrink-0">{t.closedCycleTo}</span>
                <input type="number" min={1} max={31} value={closedCycleDayEnd}
                  onChange={e => setClosedCycleDayEnd(Math.max(+e.target.value, closedCycleDayStart))}
                  className="w-12 bg-transparent text-purple-400 text-lg font-mono font-bold text-center outline-none border-b-2 border-purple-400" />
              </div>
            </div>

            {fileName && (
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="flex items-center justify-center gap-2 bg-accent hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-xl text-sm font-semibold transition-colors"
              >
                {loading
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <TrendingUp className="w-4 h-4" />}
                {results.length > 0 ? t.reanalyze : t.analyze}
              </button>
            )}
          </div>

          {results.length > 0 && (
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <Pencil className="w-4 h-4 text-muted shrink-0" />
              <span className="text-muted text-sm shrink-0">{t.sheetOwner}:</span>
              <input
                value={sheetOwnerName}
                onChange={e => setSheetOwnerName(e.target.value)}
                placeholder={t.sheetOwnerPlaceholder}
                className="bg-surface border border-border focus:border-accent rounded-lg px-3 py-1.5 text-sm outline-none transition-colors flex-1 min-w-0 max-w-xs"
                style={{ color: "var(--text)" }}
              />
            </div>
          )}

          <div onDrop={handleDrop} onDragOver={e => e.preventDefault()}
            className="border-2 border-dashed border-border hover:border-accent transition-colors rounded-2xl p-8 sm:p-10 text-center cursor-pointer group"
            onClick={() => document.getElementById("fileInput")?.click()}>
            <input id="fileInput" type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileInput} />
            <div className="flex flex-col items-center gap-3">
              {loading
                ? <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                : <FileSpreadsheet className={`w-10 h-10 transition-colors ${fileName ? "text-accent" : "text-muted group-hover:text-accent"}`} />}
              <div>
                <p className="font-medium text-sm sm:text-base" style={{ color: "var(--text)" }}>{fileName || t.dropZoneLabel}</p>
                <p className="text-muted text-xs sm:text-sm mt-1">
                  {loading ? t.processing : fileName && results.length === 0 ? t.fileReadyHint : t.dropZoneOr}
                </p>
              </div>
            </div>
          </div>
          {error && <p className="text-danger text-sm mt-2">{error}</p>}
        </section>

        {results.length > 0 && (
          <>
            {/* Summary Cards */}
            <section>
              <h2 className="font-display text-lg sm:text-xl font-semibold mb-3" style={{ color: "var(--text)" }}>{t.overview}</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard icon={<Package className="w-5 h-5" />} label={t.totalSkus} value={results.length} color="accent" />
                <StatCard icon={<Upload className="w-5 h-5" />} label={t.totalOrders} value={totalOrders.toLocaleString()} color="accent-dim" />
                <StatCard icon={<Truck className="w-5 h-5" />} label={t.totalDelivered} value={totalDelivered.toLocaleString()} color="success" />
                <StatCard icon={<TrendingUp className="w-5 h-5" />} label={t.avgNdr} value={`${avgNdr.toFixed(1)}%`} color="warning" />
              </div>
            </section>

            {/* Top SKU Highlight */}
            {topSku && (
              <section>
                <div className="bg-surface border border-border rounded-2xl p-4 sm:p-6">
                  <div className="flex flex-wrap gap-4 sm:gap-6 items-start sm:items-center">
                    <div className="min-w-0">
                      <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full font-mono">{t.highestVolume}</span>
                      <p className="font-display text-xl sm:text-2xl font-bold mt-2 truncate" style={{ color: "var(--text)" }}>{topSku.sku}</p>
                      <p className="text-muted text-sm">{topSku.totalOrders} {t.orders}</p>
                    </div>
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-6 text-sm flex-1">
                      <Pill label={colNdrDynamic} value={`${topSku.ndr}%`} />
                      <Pill label={colExpNdrDynamic} value={`${topSku.expectedNdr}%`} />
                      <Pill label={t.confirmed} value={topSku.confirmedOrders} />
                      <Pill label={t.avgProfit} value={`${topSku.avgProfit.toFixed(2)} SAR`} />
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* NDR Chart */}
            <section>
              <h2 className="font-display text-lg sm:text-xl font-semibold mb-1" style={{ color: "var(--text)" }}>{t.chartTitle}</h2>
              <p className="text-muted text-xs sm:text-sm mb-4">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-accent mr-1 align-middle" />
                {t.chartSubtitleOrange} <span className="text-accent font-semibold">Days {analysisLabel}</span>
                <span className="mx-2 text-border">·</span>
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-purple-500 mr-1 align-middle" />
                {t.chartSubtitlePurple} <span className="text-purple-400 font-semibold">Days {closedLabel}</span>
              </p>
              <div className="bg-surface border border-border rounded-2xl p-3 sm:p-6 overflow-x-auto" dir="ltr">
                <div style={{ width: Math.max(360, chartData.length * 110), height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} barGap={4} barCategoryGap="28%" margin={{ bottom: 80, top: 10, left: 5, right: 10 }}>
                      <XAxis
                        dataKey="sku"
                        tick={{ fill: "#9CA3AF", fontSize: 10, fontFamily: "monospace" }}
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                        angle={-55}
                        textAnchor="end"
                        height={90}
                      />
                      <YAxis tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} width={40} />
                      <Tooltip
                        contentStyle={{ background: "#12121A", border: "1px solid #1E1E2E", borderRadius: 8, fontSize: 12 }}
                        labelFormatter={(_l: any, p: any) => p?.[0]?.payload?.fullSku || _l}
                        formatter={(val: any, name: string) => [`${Number(val).toFixed(1)}%`, name]}
                        cursor={{ fill: "rgba(255,255,255,0.04)" }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                      <Bar dataKey="ndr" name={colNdrDynamic} fill="#F97316" radius={[5, 5, 0, 0]} minPointSize={2} />
                      <Bar dataKey="expectedNdr" name={colExpNdrDynamic} fill="#7C3AED" radius={[5, 5, 0, 0]} minPointSize={2} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <p className="text-muted text-xs mt-2 sm:hidden">← Scroll to see all SKUs</p>
            </section>

            {/* Table section */}
            <section>
              <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <div className="min-w-0">
                  <h2 className="font-display text-lg sm:text-xl font-semibold truncate" style={{ color: "var(--text)" }}>
                    {sheetOwnerName ? `${sheetOwnerName} — ${t.sheetPreview}` : t.tableTitle}
                  </h2>
                  <p className="text-muted text-xs sm:text-sm mt-0.5 flex items-center gap-1.5">
                    {t.tableSubtitle} <span className="text-accent font-medium">{t.tableSubtitleBold}</span> {t.tableSubtitleEnd}
                    <span className="inline-flex items-center gap-1 text-xs text-muted border border-border rounded-full px-2 py-0.5 ml-1">
                      <Info className="w-3 h-3 text-accent" />
                      {lang === "ar" ? "مرر الماوس فوق العناوين لرؤية صيغ الحساب" : "Hover column headers to see formulas"}
                    </span>
                  </p>
                </div>
                <button onClick={handleDownload} className="flex items-center gap-2 bg-accent hover:bg-orange-500 text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0">
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">{t.exportXlsx}</span>
                  <span className="sm:hidden">Export</span>
                </button>
              </div>

              {/* SKU Search Bar */}
              <div className="relative mb-4 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                <input
                  type="text"
                  value={skuSearch}
                  onChange={e => setSkuSearch(e.target.value)}
                  placeholder="Search SKU…"
                  className="w-full bg-surface border border-border focus:border-accent rounded-xl pl-9 pr-8 py-2 text-sm outline-none transition-colors font-mono"
                  style={{ color: "var(--text)" }}
                />
                {skuSearch && (
                  <button
                    onClick={() => setSkuSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="w-full text-sm" dir="ltr" style={{ minWidth: 1100 }}>
                  <thead>
                    <tr className="bg-surface border-b border-border">
                      {columns.map(col => (
                        <th key={col.key} className="px-3 py-3 text-left text-muted font-medium whitespace-nowrap text-xs">
                          <FormulaTooltip colKey={col.key} lang={lang} label={col.label} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResults.length === 0 && skuSearch ? (
                      <tr>
                        <td colSpan={19} className="px-3 py-10 text-center text-muted text-sm">
                          No SKU found matching <span className="font-mono text-accent">"{skuSearch}"</span>
                        </td>
                      </tr>
                    ) : filteredResults.map((r, i) => {
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
                              className="w-32 bg-bg border border-border focus:border-accent/60 rounded-lg px-2 py-1 text-xs outline-none transition-colors"
                              style={{ color: "var(--text)" }}
                            />
                          </td>
                          <td className="px-3 py-3 text-center font-medium" style={{ color: "var(--text)" }}>{r.totalOrders}</td>
                          <td className="px-3 py-3 text-center" style={{ color: "var(--text)" }}>{r.placedOrderNet}</td>
                          <td className="px-3 py-3 text-center" style={{ color: "var(--text)" }}>{r.confirmedOrders}</td>
                          <td className="px-3 py-3 text-center text-success font-medium">{r.delivered}</td>
                          <td className="px-3 py-3 text-center"><NdrBadge value={r.ndr} /></td>
                          <td className="px-3 py-3 text-center"><NdrBadge value={r.expectedNdr} dim /></td>
                          <td className="px-3 py-3 text-center text-muted">{r.netDvl}</td>
                          <td className="px-3 py-3 text-center text-muted">{r.expectedDvlOrders}</td>
                          <td className="px-3 py-3 text-center text-muted">{r.crPercent}%</td>
                          <td className="px-3 py-3 text-center font-medium" style={{ color: "var(--text)" }}>{r.avgProfit.toFixed(2)}</td>
                          <td className="px-3 py-3">
                            <input type="number" placeholder="0.00"
                              value={spentValues[r.sku] || ""}
                              onChange={e => setSpentValues(prev => ({ ...prev, [r.sku]: e.target.value }))}
                              className="w-20 bg-bg border border-accent/40 focus:border-accent rounded-lg px-2 py-1.5 text-sm outline-none transition-colors font-mono text-center"
                              style={{ color: "var(--text)" }} />
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
              <p className="text-muted text-xs mt-2">← {t.scrollHint}</p>
            </section>
          </>
        )}
      </main>
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: any; color: string }) {
  const colorMap: Record<string, string> = {
    accent: "text-accent bg-accent/10",
    "accent-dim": "text-purple-400 bg-purple-400/10",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
  }
  return (
    <div className="bg-surface border border-border rounded-xl p-4 sm:p-5">
      <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center mb-2 sm:mb-3 ${colorMap[color]}`}>{icon}</div>
      <p className="text-muted text-xs sm:text-sm font-medium mb-0.5 sm:mb-1">{label}</p>
      <p className="font-display text-2xl sm:text-3xl font-bold" style={{ color: "var(--text)" }}>{value}</p>
    </div>
  )
}

function Pill({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-muted text-xs">{label}</p>
      <p className="font-semibold text-sm sm:text-base" style={{ color: "var(--text)" }}>{value}</p>
    </div>
  )
}

function NdrBadge({ value, dim }: { value: number; dim?: boolean }) {
  const color = value >= 30 ? "text-success" : value >= 20 ? "text-warning" : "text-danger"
  return <span className={`font-mono text-xs font-semibold ${dim ? "text-purple-400" : color}`}>{value}%</span>
}
