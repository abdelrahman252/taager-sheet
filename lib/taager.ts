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
  analysisDayStart: number
  analysisDayEnd: number
  closedCycleDayStart: number
  closedCycleDayEnd: number
}

interface RawRow {
  status: string
  date: Date | string | number
  products: string
  profit: number
  tax: number
}

function safeNum(val: any): number {
  if (val === null || val === undefined || val === "") return 0
  const n = parseFloat(String(val).replace(/,/g, "."))
  return isNaN(n) ? 0 : n
}

function dayOf(val: Date | string | number): number {
  if (val instanceof Date) return val.getDate()
  if (typeof val === "number") {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000))
    return d.getUTCDate()
  }
  return new Date(String(val)).getDate()
}

function calcSKU(rows: RawRow[], sku: string, allRows: RawRow[], closedCycleDayStart: number, closedCycleDayEnd: number): SKUResult {
  const main = rows.filter(r => r.products && r.products.includes(sku))
  const closed = allRows.filter(r =>
    r.products && r.products.includes(sku) &&
    dayOf(r.date) >= closedCycleDayStart && dayOf(r.date) <= closedCycleDayEnd
  )

  const totalOrders = main.length
  const placedOrderNet = main.filter(r => r.status !== STATUS.CANCELLED).length
  const confirmedOrders = main.filter(r => r.status !== STATUS.CANCELLED && r.status !== STATUS.DELIVERED).length
  const delivered = main.filter(r => r.status === STATUS.DELIVERED).length
  const ndr = placedOrderNet > 0 ? (delivered / placedOrderNet) * 100 : 0

  const closedPlaced = closed.filter(r => r.status !== STATUS.CANCELLED).length
  const closedDelivered = closed.filter(r => r.status === STATUS.DELIVERED).length
  const expectedNdr = closedPlaced > 0 ? (closedDelivered / closedPlaced) * 100 : 0

  // Net DVL = NDR% * Placed Order Net
  const netDvl = Math.round((ndr / 100) * placedOrderNet)
  // Expected DVL Orders = Expected NDR% * Placed Order Net
  const expectedDvlOrders = Math.round((expectedNdr / 100) * placedOrderNet)

  const crPercent = placedOrderNet > 0 ? (confirmedOrders / placedOrderNet) * 100 : 0

  let sumProfit = 0
  let sumTax = 0
  for (const r of main) {
    sumProfit += safeNum(r.profit)
    sumTax += safeNum(r.tax)
  }
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
    netDvl,
    crPercent: +crPercent.toFixed(2),
    avgProfit: +avgProfit.toFixed(2),
    sumProfit: +sumProfit.toFixed(2),
    sumTax: +sumTax.toFixed(2),
  }
}

export function parseSheet(workbook: any, opts: ParseOptions): SKUResult[] {
  const sheetName = workbook.SheetNames[0]
  const ws = workbook.Sheets[sheetName]
  const utils = (workbook as any).__utils
  if (!utils) throw new Error("XLSX utils not attached to workbook")

  const raw: any[] = utils.sheet_to_json(ws, { defval: "" })

  const rows: RawRow[] = raw.map((r: any) => ({
    status: String(r["الحالة"] || ""),
    date: r["تاريخ الإنشاء"] || "",
    products: String(r["المنتجات"] || ""),
    profit: safeNum(r["ربح الطلب"]),
    tax: safeNum(r["ربح الضريبة"]),
  }))

  const analysisRows = rows.filter(r => {
    const d = dayOf(r.date)
    return d >= opts.analysisDayStart && d <= opts.analysisDayEnd
  })

  const skuSet = new Set<string>()
  analysisRows.forEach(r => {
    if (r.products) {
      r.products.split(",").map((s: string) => s.trim()).filter(Boolean).forEach((s: string) => skuSet.add(s))
    }
  })

  return Array.from(skuSet)
    .map(sku => calcSKU(analysisRows, sku, rows, opts.closedCycleDayStart, opts.closedCycleDayEnd))
    .filter(s => s.totalOrders > 0)
    .sort((a, b) => b.totalOrders - a.totalOrders)
}

export function exportToXlsx(
  results: SKUResult[],
  spentValues: Record<string, string>,
  productNames: Record<string, string>,
  sheetOwnerName: string,
  analysisDayStart: number,
  analysisDayEnd: number,
  closedCycleDayStart: number,
  closedCycleDayEnd: number,
) {
  import("xlsx").then(XLSX => {
    const data = results.map(r => {
      const spent = parseFloat(spentValues[r.sku] || "0") || 0
      const name = productNames[r.sku] || r.sku

      const netDvl = r.netDvl
      const expectedDvlOrders = r.expectedDvlOrders
      const cr = r.placedOrderNet > 0 ? r.confirmedOrders / r.placedOrderNet : 0
      const cpa = spent && r.placedOrderNet > 0 ? spent / r.placedOrderNet : ""
      const breakevenCpa = +((r.expectedNdr / 100) * r.avgProfit / 3.75).toFixed(2)
      const expectedProfit = +(r.avgProfit * expectedDvlOrders / 3.75).toFixed(2)
      const expectedNetProfit = +(expectedProfit - spent).toFixed(2)
      const profit = +(netDvl * r.avgProfit / 3.75).toFixed(2)
      const netProfit = +(profit - spent).toFixed(2)

      const analysisLabel = analysisDayStart === 1 ? `1–${analysisDayEnd}` : `${analysisDayStart}–${analysisDayEnd}`
      const closedLabel = closedCycleDayStart === 1 ? `1–${closedCycleDayEnd}` : `${closedCycleDayStart}–${closedCycleDayEnd}`

      return {
        "sku": r.sku,
        "product name": name,
        "total order": r.totalOrders,
        [`Placed\nOrder net`]: r.placedOrderNet,
        "Confirmed orders": r.confirmedOrders,
        [`NDR%\n${analysisLabel}`]: +(r.ndr / 100).toFixed(4),
        [`Expected NDR%\n${closedLabel}`]: +(r.expectedNdr / 100).toFixed(4),
        "Net dvl": netDvl,
        "Expected\nDVL Orders": expectedDvlOrders,
        "CR%": +cr.toFixed(4),
        "AVG PROFIT": r.avgProfit,
        "Total ads Cost\nUSD": spent || "",
        "CPA\nUSD": spent ? +Number(cpa).toFixed(2) : "",
        "Breakeven CPA\nUSD": breakevenCpa,
        "Expected profit\nUSD": expectedProfit,
        "Expected net profit\nUSD": expectedNetProfit,
        "Pofit": profit,
        "Net profit": netProfit,
      }
    })

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1")

    ws["!cols"] = [
      { wch: 18 }, { wch: 22 }, { wch: 12 }, { wch: 14 }, { wch: 16 },
      { wch: 12 }, { wch: 16 }, { wch: 10 }, { wch: 14 }, { wch: 8 },
      { wch: 12 }, { wch: 16 }, { wch: 10 }, { wch: 16 }, { wch: 16 },
      { wch: 20 }, { wch: 12 }, { wch: 12 },
    ]

    const fileName = sheetOwnerName ? `${sheetOwnerName}_filled.xlsx` : "sheet_filled.xlsx"
    XLSX.writeFile(wb, fileName)
  })
}
