# 报价查询 (quick_quote)

Phone page for the Canton Fair: scan a sample's barcode (our style no, 我司货号)
or type it, and see that style's quote prices.

- **Holds no data.** The price Excel is imported on each phone (「导入Excel」)
  and stays on that phone (browser storage). Nothing is uploaded anywhere.
- **Works offline** after the first visit (service worker `sw.js`).
- Columns are found by their title text (`货号`, `客人`, `低价`; price columns
  end in an exchange rate like `6.5`; all other columns are listed under them).
  Change these in the top of the script in `index.html`.
- Styles looked up before stay below the current card as one short row each
  (style no, client, prices), kept on the phone.
- 实际报价 box on each card: what we really quoted (tap one of the three
  prices to fill it while empty), shown again in the past-lookups row. Kept on
  the phone by 货号 + 客人 + 尺码; 「清空」 clears lookups and quotes together.
- Scanned code not in the table: it stays in the search box with the cursor in
  it, and 货号 1-2 characters off (misreads) are listed underneath.
- Libraries are stored in `lib/` (no CDN, for mainland China):
  SheetJS `xlsx` 0.18.5 (reads Excel), ZBar `@undecaf/zbar-wasm` 0.11.0 (barcodes, the
  `dist/inlined` build: one file, no separate .wasm).
  Android Chrome uses its built-in BarcodeDetector instead.
- After changing any file, bump `VERSION` in `sw.js` so phones fetch the new copy.

Install on a phone: open the page once with internet, Safari Share → 添加到主屏幕
(iPhone) or Chrome menu → 安装应用 (Android), then 导入Excel.

Barcodes held at a slant: each camera frame is tried turned by 0, 15, -15, 30,
-30 degrees in turn (`ANGLES`). Stapled labels: every 2nd frame the scanner also
takes, per column, the median brightness of each 32-row strip
(`throughStaple`), so a slanted staple drops out of the bars. A staple running
straight down the bars can't be read; type the 货号 instead.
