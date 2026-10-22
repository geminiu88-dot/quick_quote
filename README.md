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
- Libraries are stored in `lib/` (no CDN, for mainland China):
  SheetJS `xlsx` 0.18.5 (reads Excel), ZXing `@zxing/library` 0.21.3 (barcodes).
  Android Chrome uses its built-in BarcodeDetector instead.
- After changing any file, bump `VERSION` in `sw.js` so phones fetch the new copy.

Install on a phone: open the page once with internet, Safari Share → 添加到主屏幕
(iPhone) or Chrome menu → 安装应用 (Android), then 导入Excel.
