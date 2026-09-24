// src/components/reports/daily/DailyReportPrintStyles.tsx

export function DailyReportPrintStyles() {
  return (
    <style>{`
      /* ============================================================
         DEFAULT / SCREEN
         ============================================================ */

      .daily-report-print-only,
      .daily-report-print-table {
        display: none;
      }

      /* ============================================================
         PRINT PAGE
         ============================================================ */

      @page {
        size: A4 portrait;
        margin: 10mm 11mm 12mm;
      }

      @media print {
        /* ==========================================================
           1. PRINT DOCUMENT BASE
           ========================================================== */

        html,
        body {
          width: 100% !important;
          min-width: 0 !important;
          min-height: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: visible !important;
          background: #ffffff !important;
        }

        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color: #2b1e1a !important;
          font-family: Arial, "DM Sans", sans-serif !important;
        }

        /*
         * The authenticated AppShell is a viewport-height flex layout
         * with overflow clipping and a fixed sidebar offset. Flatten only
         * the ancestors of this report for print so those screen layout
         * constraints cannot cut off later report pages.
         */

        body:has(#daily-report-print-root),
        body:has(#daily-report-print-root)
          *:has(#daily-report-print-root) {
          width: 100% !important;
          min-width: 0 !important;
          min-height: 0 !important;
          max-width: none !important;
          max-height: none !important;
          height: auto !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: visible !important;
        }

        /* Remove hidden shell siblings from layout flow as well. */

        body:has(#daily-report-print-root)
          *:has(#daily-report-print-root)
          > *:not(#daily-report-print-root):not(:has(#daily-report-print-root)) {
          display: none !important;
        }

        /*
         * Your global.css already hides the application during print.
         * We keep that architecture and explicitly restore visibility
         * only for this report.
         */

        body * {
          visibility: hidden !important;
        }

        #daily-report-print-root,
        #daily-report-print-root * {
          visibility: visible !important;
        }

        /* ==========================================================
           2. REPORT ROOT
           ========================================================== */

        #daily-report-print-root {
          display: block !important;

          position: relative !important;

          width: 100% !important;
          min-width: 0 !important;
          max-width: none !important;

          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;

          margin: 0 !important;
          padding: 0 !important;

          overflow: visible !important;

          background: #ffffff !important;
          color: #2b1e1a !important;

          box-sizing: border-box !important;
        }

        #daily-report-print-root *,
        #daily-report-print-root *::before,
        #daily-report-print-root *::after {
          box-sizing: border-box !important;
        }

        /*
         * Do not allow application-level transforms or positioned
         * containers to interfere with pagination.
         */

        #daily-report-print-root {
          transform: none !important;
          zoom: 1 !important;
        }

        /* ==========================================================
           3. HIDE INTERACTIVE SCREEN HEADER
           ========================================================== */

        #daily-report-print-root .daily-report-screen-only,
        #daily-report-print-root .daily-report-no-print {
          display: none !important;
          visibility: hidden !important;
        }

        /*
         * Print header must remain visible.
         */

        #daily-report-print-root .daily-report-print-only {
          display: block !important;
          visibility: visible !important;
        }

        /* ==========================================================
           4. REPORT CONTENT
           ========================================================== */

        #daily-report-print-root .daily-report-content {
          display: block !important;

          width: 100% !important;
          min-width: 0 !important;
          max-width: none !important;

          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;

          margin: 0 !important;
          padding: 0 !important;

          overflow: visible !important;

          position: relative !important;
        }

        /*
         * IMPORTANT:
         * Every direct report component becomes a normal block.
         *
         * No fixed height.
         * No max height.
         * No clipping.
         * No scrolling.
         */

        #daily-report-print-root
          .daily-report-content
          > * {
          display: block !important;

          width: 100% !important;
          min-width: 0 !important;
          max-width: none !important;

          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;

          margin-top: 0 !important;

          overflow: visible !important;

          position: relative !important;
        }

        /*
         * Normal spacing between report sections.
         */

        #daily-report-print-root
          .daily-report-content
          > * + * {
          margin-top: 4mm !important;
        }

        /* ==========================================================
           5. REPORT SECTIONS
           ========================================================== */

        #daily-report-print-root
          .daily-report-content
          > section {
          display: block !important;

          width: 100% !important;
          min-width: 0 !important;
          max-width: none !important;

          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;

          margin-left: 0 !important;
          margin-right: 0 !important;

          overflow: visible !important;

          background: #ffffff !important;

          border: 0 !important;
          border-bottom: 1px solid #ded8d4 !important;
          border-radius: 0 !important;

          box-shadow: none !important;

          /*
           * Sections may cross pages.
           */
          break-inside: auto !important;
          page-break-inside: auto !important;
        }

        /* ==========================================================
           6. SECTION HEADERS
           ========================================================== */

        #daily-report-print-root
          .daily-report-content
          h1,
        #daily-report-print-root
          .daily-report-content
          h2,
        #daily-report-print-root
          .daily-report-content
          h3,
        #daily-report-print-root
          .daily-report-content
          h4 {
          color: #2b1e1a !important;

          word-break: normal !important;
          overflow-wrap: break-word !important;
          white-space: normal !important;

          break-after: avoid-page !important;
          page-break-after: avoid !important;
        }

        #daily-report-print-root
          .daily-report-content
          h2 {
          font-size: 11pt !important;
          line-height: 1.25 !important;
          font-weight: 700 !important;

          margin-top: 0 !important;
          margin-bottom: 2mm !important;
        }

        #daily-report-print-root
          .daily-report-content
          h3 {
          font-size: 9pt !important;
          line-height: 1.3 !important;

          margin-top: 0 !important;
          margin-bottom: 1.5mm !important;
        }

        /* ==========================================================
           7. REMOVE SCREEN SCROLLING / HEIGHT CONSTRAINTS
           ========================================================== */

        #daily-report-print-root
          .overflow-hidden,
        #daily-report-print-root
          .overflow-auto,
        #daily-report-print-root
          .overflow-x-auto,
        #daily-report-print-root
          .overflow-y-auto,
        #daily-report-print-root
          .overflow-scroll {
          overflow: visible !important;
        }

        #daily-report-print-root
          [class*="max-h-"] {
          max-height: none !important;
        }

        #daily-report-print-root
          [class*="min-h-screen"] {
          min-height: 0 !important;
        }

        /*
         * Do NOT blindly convert every h-full to auto.
         * Only report containers need to lose fixed height.
         */

        #daily-report-print-root
          .daily-report-content
          [class*="h-full"] {
          height: auto !important;
        }

        /* ==========================================================
           8. FINANCIAL SNAPSHOT
           ========================================================== */

        #daily-report-print-root
          .daily-report-financial-grid {
          display: grid !important;

          width: 100% !important;
          min-width: 0 !important;

          grid-template-columns:
            repeat(4, minmax(0, 1fr)) !important;

          gap: 3mm !important;

          overflow: visible !important;
        }

        #daily-report-print-root
          .daily-report-metric-card {
          display: block !important;

          width: 100% !important;
          min-width: 0 !important;
          max-width: none !important;

          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;

          padding: 3mm !important;

          border: 1px solid #e3ddda !important;
          border-radius: 2mm !important;

          background: #ffffff !important;
          box-shadow: none !important;

          overflow: visible !important;

          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }

        #daily-report-print-root
          .daily-report-metric-icon {
          display: none !important;
        }

        #daily-report-print-root
          .daily-report-metric-card
          p {
          margin-top: 1mm !important;

          font-size: 8pt !important;
          line-height: 1.3 !important;

          white-space: normal !important;
          word-break: normal !important;
          overflow-wrap: break-word !important;
        }

        #daily-report-print-root
          .daily-report-metric-card
          p:first-child {
          color: #6b5b55 !important;
          font-size: 7pt !important;
        }

        /* ==========================================================
           9. MONEY FLOW
           ========================================================== */

        #daily-report-print-root
          .daily-report-money-flow {
          width: 100% !important;
          min-width: 0 !important;
          max-width: none !important;

          height: auto !important;
          max-height: none !important;

          overflow: visible !important;
        }

        #daily-report-print-root
          .daily-report-money-flow
          .p-4 {
          padding: 2mm 0 !important;
        }

        #daily-report-print-root
          .daily-report-money-flow
          .flex {
          min-width: 0 !important;
        }

        /* ==========================================================
           10. PAYMENT BREAKDOWN
           ========================================================== */

        #daily-report-print-root
          .daily-report-payment-grid {
          display: grid !important;

          width: 100% !important;
          min-width: 0 !important;

          grid-template-columns:
            repeat(5, minmax(0, 1fr)) !important;

          gap: 0 !important;

          border: 0 !important;

          overflow: visible !important;

          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }

        #daily-report-print-root
          .daily-report-payment-grid
          > div {
          display: block !important;

          min-width: 0 !important;
          max-width: none !important;

          padding: 2mm !important;

          border: 0 !important;

          overflow: visible !important;

          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }

        #daily-report-print-root
          .daily-report-payment-grid
          p {
          font-size: 8pt !important;
          line-height: 1.3 !important;

          white-space: normal !important;
          word-break: normal !important;
          overflow-wrap: break-word !important;
        }

        /* ==========================================================
           11. ALL REPORT TABLES
           ========================================================== */

        #daily-report-print-root
          .daily-report-content
          table {
          display: table !important;

          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;

          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;

          margin: 0 !important;
          padding: 0 !important;

          border-collapse: collapse !important;
          border-spacing: 0 !important;

          table-layout: fixed !important;

          overflow: visible !important;

          font-size: 8pt !important;
          line-height: 1.3 !important;

          break-inside: auto !important;
          page-break-inside: auto !important;
        }

        /*
         * Repeated table header when a table crosses pages.
         */

        #daily-report-print-root
          .daily-report-content
          table
          thead {
          display: table-header-group !important;
        }

        #daily-report-print-root
          .daily-report-content
          table
          tbody {
          display: table-row-group !important;
        }

        #daily-report-print-root
          .daily-report-content
          table
          tfoot {
          display: table-footer-group !important;
        }

        /* ==========================================================
           12. TABLE ROWS
           ========================================================== */

        #daily-report-print-root
          .daily-report-content
          table
          tr {
          display: table-row !important;

          width: 100% !important;

          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;

          visibility: visible !important;

          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }

        /* ==========================================================
           13. TABLE CELLS
           ========================================================== */

        #daily-report-print-root
          .daily-report-content
          table
          th,
        #daily-report-print-root
          .daily-report-content
          table
          td {
          display: table-cell !important;

          height: auto !important;
          max-height: none !important;

          padding: 1.8mm 2mm !important;

          white-space: normal !important;
          word-break: normal !important;
          overflow-wrap: break-word !important;

          vertical-align: top !important;

          overflow: visible !important;

          visibility: visible !important;
        }

        #daily-report-print-root
          .daily-report-content
          table
          th {
          color: #5a3e38 !important;

          font-size: 7pt !important;
          font-weight: 700 !important;

          text-align: left !important;
          text-transform: uppercase !important;

          border-bottom: 1px solid #8b2635 !important;

          break-after: avoid-page !important;
          page-break-after: avoid !important;
        }

        #daily-report-print-root
          .daily-report-content
          table
          td {
          color: #2b1e1a !important;

          font-size: 8pt !important;
          line-height: 1.35 !important;

          border-bottom: 1px solid #eee9e6 !important;
        }

        /* ==========================================================
           14. PRODUCT TABLE
           ========================================================== */

        #daily-report-print-root
          .daily-report-product-table {
          table-layout: fixed !important;
          width: 100% !important;
        }

        #daily-report-print-root
          .daily-report-product-table
          th:nth-child(1),
        #daily-report-print-root
          .daily-report-product-table
          td:nth-child(1) {
          width: 62% !important;
        }

        #daily-report-print-root
          .daily-report-product-table
          th:nth-child(2),
        #daily-report-print-root
          .daily-report-product-table
          td:nth-child(2) {
          width: 15% !important;

          text-align: right !important;
          white-space: nowrap !important;
        }

        #daily-report-print-root
          .daily-report-product-table
          th:nth-child(3),
        #daily-report-print-root
          .daily-report-product-table
          td:nth-child(3) {
          width: 23% !important;

          text-align: right !important;
          white-space: nowrap !important;
        }

        #daily-report-print-root
          .daily-report-product-table
          td:first-child
          > div {
          display: flex !important;

          width: 100% !important;
          min-width: 0 !important;

          align-items: flex-start !important;
        }

        #daily-report-print-root
          .daily-report-product-table
          td:first-child
          span:last-child {
          min-width: 0 !important;

          white-space: normal !important;
          word-break: normal !important;
          overflow-wrap: break-word !important;
        }

        /* ==========================================================
           15. INVENTORY TABLE
           ========================================================== */

        #daily-report-print-root
          .daily-report-inventory-table {
          table-layout: fixed !important;
          width: 100% !important;
        }

        #daily-report-print-root
          .daily-report-inventory-table
          th:nth-child(1),
        #daily-report-print-root
          .daily-report-inventory-table
          td:nth-child(1) {
          width: 60% !important;
        }

        #daily-report-print-root
          .daily-report-inventory-table
          th:nth-child(2),
        #daily-report-print-root
          .daily-report-inventory-table
          td:nth-child(2),
        #daily-report-print-root
          .daily-report-inventory-table
          th:nth-child(3),
        #daily-report-print-root
          .daily-report-inventory-table
          td:nth-child(3) {
          width: 20% !important;
          text-align: right !important;
          white-space: nowrap !important;
        }

        /* ==========================================================
           16. TABLE WRAPPERS
           ========================================================== */

        #daily-report-print-root
          .daily-report-product-list,
        #daily-report-print-root
          .daily-report-category-list,
        #daily-report-print-root
          .daily-report-expense-list,
        #daily-report-print-root
          .daily-report-stock-alerts,
        #daily-report-print-root
          .daily-report-inventory,
        #daily-report-print-root
          .daily-report-inventory-check {
          display: block !important;

          width: 100% !important;
          min-width: 0 !important;
          max-width: none !important;

          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;

          overflow: visible !important;
        }

        /* ==========================================================
           17. CATEGORY / EXPENSE CONTENT
           ========================================================== */

        #daily-report-print-root
          .daily-report-category-screen-list,
        #daily-report-print-root
          .daily-report-expense-screen-list,
        #daily-report-print-root
          .daily-report-category-screen-content,
        #daily-report-print-root
          .daily-report-expense-screen-content {
          visibility: visible !important;

          width: 100% !important;
          height: auto !important;
          max-height: none !important;

          overflow: visible !important;
        }

        /* ==========================================================
           18. REPORT DATA
           ========================================================== */

        #daily-report-print-root
          .daily-report-data-section {
          display: block !important;

          width: 100% !important;
          min-width: 0 !important;
          max-width: none !important;

          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;

          overflow: visible !important;
        }

        #daily-report-print-root
          .daily-report-data-section
          p {
          white-space: normal !important;
          word-break: normal !important;
          overflow-wrap: break-word !important;

          font-size: 7pt !important;
          line-height: 1.35 !important;
        }

        /* ==========================================================
           19. FLEX / GRID
           ========================================================== */

        #daily-report-print-root
          .daily-report-content
          .flex,
        #daily-report-print-root
          .daily-report-content
          .grid {
          min-width: 0 !important;
        }

        #daily-report-print-root
          .daily-report-content
          .flex-1 {
          min-width: 0 !important;
        }

        /*
         * Do not let flex children create horizontal overflow.
         */

        #daily-report-print-root
          .daily-report-content
          .flex
          > * {
          min-width: 0 !important;
        }

        /* ==========================================================
           20. TEXT
           ========================================================== */

        #daily-report-print-root
          .daily-report-content
          p,
        #daily-report-print-root
          .daily-report-content
          span,
        #daily-report-print-root
          .daily-report-content
          div {
          overflow-wrap: break-word !important;
        }

        #daily-report-print-root
          .daily-report-content
          h1,
        #daily-report-print-root
          .daily-report-content
          h2,
        #daily-report-print-root
          .daily-report-content
          h3,
        #daily-report-print-root
          .daily-report-content
          h4,
        #daily-report-print-root
          .daily-report-content
          th,
        #daily-report-print-root
          .daily-report-content
          td {
          word-break: normal !important;
        }

        /* ==========================================================
           21. PREVENT SCREEN DECORATION FROM AFFECTING PDF
           ========================================================== */

        #daily-report-print-root
          .shadow,
        #daily-report-print-root
          [class*="shadow-"] {
          box-shadow: none !important;
        }

        #daily-report-print-root
          [class*="rounded-"] {
          border-radius: 0 !important;
        }

        #daily-report-print-root
          [class*="bg-white"] {
          background: #ffffff !important;
        }

        /*
         * Prevent dark screen buttons/badges from becoming white
         * text on white paper.
         */

        #daily-report-print-root
          [class*="text-white"] {
          color: #2b1e1a !important;
        }

        /* ==========================================================
           22. FOOTER
           ========================================================== */

        #daily-report-print-root
          .daily-report-print-footer {
          display: block !important;

          width: 100% !important;

          margin-top: 5mm !important;
          padding-top: 3mm !important;

          border-color: #d7cfca !important;

          overflow: visible !important;

          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }

        /* ==========================================================
           23. PAGINATION
           ========================================================== */

        /*
         * The report itself may span unlimited A4 pages.
         */

        #daily-report-print-root
          .daily-report-content {
          break-inside: auto !important;
          page-break-inside: auto !important;
        }

        #daily-report-print-root
          .daily-report-content
          > section {
          break-inside: auto !important;
          page-break-inside: auto !important;
        }

        /*
         * Tables can continue onto another page.
         */

        #daily-report-print-root
          table {
          break-inside: auto !important;
          page-break-inside: auto !important;
        }

        /*
         * A product/stock row should never be split halfway.
         */

        #daily-report-print-root
          table
          tbody
          tr {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }

        /*
         * Small metric/payment blocks stay together.
         */

        #daily-report-print-root
          .daily-report-metric-card,
        #daily-report-print-root
          .daily-report-payment-grid,
        #daily-report-print-root
          .daily-report-print-footer {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }

        /* ==========================================================
           24. PRINT HEADER
           ========================================================== */

        #daily-report-print-root
          .daily-report-print-only {
          width: 100% !important;
          max-width: none !important;

          height: auto !important;
          max-height: none !important;

          overflow: visible !important;

          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }
      }

      /* ============================================================
         SCREEN
         ============================================================ */

      @media screen {
        .daily-report-print-only,
        .daily-report-print-table {
          display: none !important;
        }
      }
    `}</style>
  );
}
