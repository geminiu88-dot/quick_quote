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
- After changing any file, bump `VERSION` in `sw.js` so phones fetch the new copy,
  and the version shown in `index.html` (`id="ver"`, top right) to the same number.

Install on a phone: open the page once with internet, Safari Share → 添加到主屏幕
(iPhone) or Chrome menu → 安装应用 (Android), then 导入Excel.

Barcodes held at a slant: each camera frame is tried turned by 0, 15, -15, 30,
-30 degrees in turn (`ANGLES`). Stapled labels: every 2nd frame the scanner also
takes, per column, the median brightness of each 32-row strip
(`throughStaple`), so a slanted staple drops out of the bars. A staple running
straight down the bars can't be read; type the 货号 instead.

Countries: import the 市场区分表 (columns 组别, 国别, 英文国别, 小区, 大区) with the
same 「导入Excel」 button; it is recognised by its titles and kept on the phone.
Search text without digits looks up countries (Chinese or English, part of the
name; USA / UK / UAE work too) and shows the group (组别).

Cut-off labels: long codes (12+ characters) are printed wider than the label,
so the end of the barcode is missing and normal readers refuse them.
`cut128.js` reads Code 128 from the start pattern as far as the bars go. Such a
reading is used only if the whole style no is visible (a `~` follows it, or the
stop pattern was seen) and that 货号 is in the price table; the app then shows a
⚠ 条码不完整 warning. The camera is asked for 1080p and the middle of the picture
is read at full sharpness (dense labels failed when the picture was shrunk).
