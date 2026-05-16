# Taager Analytics Dashboard

Upload your Taager `.xlsx` orders sheet → get instant SKU metrics → fill Spent → download the Abdelrahman sheet filled.

## What it does

- Parses your Taager export sheet client-side (file never leaves your browser)
- Calculates per SKU:
  - **Total Orders** — all orders including cancelled
  - **Placed Order Net** — removes `طلب ملغي بواسطتك`
  - **Confirmed Orders** — removes cancelled + `تم التوصيل`
  - **NDR%** — `تم التوصيل / Placed Order Net`
  - **Expected NDR%** — same calc but on closed-cycle days only
  - **AVG Profit** — `(sum ربح الطلب - sum ربح الضريبة) / total orders`
- Lets you fill in **Spent (USD)** per SKU manually
- Exports the filled Abdelrahman sheet as `.xlsx`

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → New Project → Import repo
3. Framework: **Next.js** (auto-detected)
4. Click **Deploy** — done ✅

No env variables needed. Everything runs client-side.

## Business Logic Reference

| Metric | Calculation |
|---|---|
| Total Orders | All rows matching SKU in days 1–N |
| Placed Order Net | Total - `طلب ملغي بواسطتك` |
| Confirmed Orders | Total - cancelled - `تم التوصيل` |
| NDR% | `تم التوصيل ÷ Placed Net × 100` |
| Expected NDR% | Same but using days 1–cutoff only |
| AVG Profit | `(Σ ربح الطلب - Σ ربح الضريبة) ÷ Total Orders` |
