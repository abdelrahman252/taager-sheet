export const STATUS = {
  CANCELLED: "طلب ملغي بواسطتك",
  DELIVERED: "تم التوصيل",
}

export interface SKUResult {
  sku: string
  productName: string
  totalOrders: number
  placedOrderNet: number
  confirmedOrders: number
  delivered: number
  ndr: number
  expectedNdr: number
  expectedDvlOrders: number
  netDvl: number
  crPercent: number
  avgProfit: number
  sumProfit: number
  sumTax: number
}

export interface ParseOptions {
  analysisDayEnd: number
  closedCycleDayEnd: number
}

interface RawRow {
  status: string
  date: Date | string | number
  products: string
  profit: number
  tax: number
}

function dayOf(val: Date | string | number): number {
  if (val instanceof Date) return val.getDate()
  if (typeof val === "number") {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000))
    return d.getUTCDate()
  }
  return new Date(String(val)).getDate()
}

function calcSKU(rows: RawRow[], sku: string, allRows: RawRow[], closedCycleDayEnd: number): SKUResult {
  const main = rows.filter(r => r.products && r.products.includes(sku))
  const closed = allRows.filter(r =>
    r.products && r.products.includes(sku) && dayOf(r.date) <= closedCycleDayEnd
  )

  const totalOrders = main.length
  const placedOrderNet = main.filter(r => r.status !== STATUS.CANCELLED).length
  const confirmedOrders = main.filter(r => r.status !== STATUS.CANCELLED && r.status !== STATUS.DELIVERED).length
  const delivered = main.filter(r => r.status === STATUS.DELIVERED).length
  const ndr = placedOrderNet > 0 ? (delivered / placedOrderNet) * 100 : 0

  const closedPlaced = closed.filter(r => r.status !== STATUS.CANCELLED).length
  const closedDelivered = closed.filter(r => r.status === STATUS.DELIVERED).length
  const expectedNdr = closedPlaced > 0 ? (closedDelivered / closedPlaced) * 100 : 0
  const expectedDvlOrders = Math.round(placedOrderNet * (expectedNdr / 100))
  const crPercent = placedOrderNet > 0 ? (confirmedOrders / placedOrderNet) * 100 : 0

  const sumProfit = main.reduce((s, r) => s + (Number(r.profit) || 0), 0)
  const sumTax = main.reduce((s, r) => s + (Number(r.tax) || 0), 0)
  const avgProfit = totalOrders > 0 ? (sumProfit - sumTax) / totalOrders : 0

  return {
    sku,
    productName: sku,
    totalOrders,
    placedOrderNet,
    confirmedOrders,
    delivered,
    ndr: +ndr.toFixed(2),
    expectedNdr: +expectedNdr.toFixed(2),
    expectedDvlOrders,
    netDvl: delivered,
    crPercent: +crPercent.toFixed(2),
    avgProfit: +avgProfit.toFixed(2),
    sumProfit: +sumProfit.toFixed(2),
    sumTax: +sumTax.toFixed(2),
  }
}

export function parseSheet(workbook: any, opts: ParseOptions): SKUResult[] {
  // Dynamic import of xlsx happens in the browser — workbook already parsed
  const sheetName = workbook.SheetNames[0]
  const ws = workbook.Sheets[sheetName]

  // We need XLSX utils — passed in via workbook reference won't work,
  // so we use a simple manual JSON conversion approach
  // workbook is already parsed by xlsx in the component
  // Use utils from the same dynamic import
  const utils = (workbook as any).__utils
  if (!utils) throw new Error("XLSX utils not attached to workbook")

  const raw: any[] = utils.sheet_to_json(ws, { defval: "" })

  const rows: RawRow[] = raw.map((r: any) => ({
    status: r["الحالة"] || "",
    date: r["تاريخ الإنشاء"] || "",
    products: r["المنتجات"] || "",
    profit: Number(r["ربح الطلب"] || 0),
    tax: Number(r["ربح الضريبة"] || 0),
  }))

  const analysisRows = rows.filter(r => {
    const d = dayOf(r.date)
    return d >= 1 && d <= opts.analysisDayEnd
  })

  const skuSet = new Set<string>()
  analysisRows.forEach(r => {
    if (r.products) {
      r.products.split(",").map((s: string) => s.trim()).filter(Boolean).forEach((s: string) => skuSet.add(s))
    }
  })

  return Array.from(skuSet)
    .map(sku => calcSKU(analysisRows, sku, rows, opts.closedCycleDayEnd))
    .filter(s => s.totalOrders > 0)
    .sort((a, b) => b.totalOrders - a.totalOrders)
}

export function exportToXlsx(results: SKUResult[], spentValues: Record<string, string>) {
  // xlsx is dynamically imported only in browser
  import("xlsx").then(XLSX => {
    const data = results.map(r => {
      const spent = parseFloat(spentValues[r.sku] || "0") || 0
      const cpaUsd = r.placedOrderNet > 0 ? spent / r.placedOrderNet : 0
      const expectedProfit = r.expectedDvlOrders * r.avgProfit
      const expectedNetProfit = expectedProfit - spent
      const profit = r.delivered * r.avgProfit
      const netProfit = profit - spent

      return {
        "SKU": r.sku,
        "Total Orders": r.totalOrders,
        "Placed Order Net": r.placedOrderNet,
        "Confirmed Orders": r.confirmedOrders,
        "تم التوصيل": r.delivered,
        "NDR %": `${r.ndr}%`,
        "Expected NDR %": `${r.expectedNdr}%`,
        "Expected DVL Orders": r.expectedDvlOrders,
        "CR %": `${r.crPercent}%`,
        "AVG PROFIT": r.avgProfit,
        "Total Ads Cost (USD)": spent || "",
        "CPA (USD)": spent ? +cpaUsd.toFixed(2) : "",
        "Expected Profit": +expectedProfit.toFixed(2),
        "Expected Net Profit": +expectedNetProfit.toFixed(2),
        "Profit": +profit.toFixed(2),
        "Net Profit": +netProfit.toFixed(2),
      }
    })

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Dashboard")
    ws["!cols"] = Array(16).fill({ wch: 16 })
    XLSX.writeFile(wb, "abdelrahman_filled.xlsx")
  })
}
