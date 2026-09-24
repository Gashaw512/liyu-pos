// src/components/reports/daily/DailyReportPrintStyles.tsx

export function DailyReportPrintStyles() {
  return (
    <style>{`
      /* ============================================================
         SCREEN
         ============================================================ */

      .daily-report-print-only,
      .daily-report-print-table {
        display: none;
      }

      /* ============================================================
         PAGE
         ============================================================ */

      @page {
        size: A4 portrait;
        margin: 10mm 11mm 12mm;
      }

      /* ============================================================
         PRINT
         ============================================================ */

      @media print {
        /* ----------------------------------------------------------
           DOCUMENT
           ---------------------------------------------------------- */

        html,
        body {
          width: 100% !important;
          min-width: 0 !important;
          min-height: 0 !important;

          margin: 0 !important;
          padding: 0 !important;

          overflow: visible !important;

          background: #fff !important;
        }

        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;

          font-family:
            Arial,
            "DM Sans",
            sans-serif !important;

          color: #2b1e1a !important;
        }

        /* ----------------------------------------------------------
           IMPORTANT PRINT ARCHITECTURE

           Keep only the report root visible.

           This is intentional because the application contains
           navigation, dashboard wrappers, dialogs and other
           screen-only elements that should never enter the PDF.
           ---------------------------------------------------------- */

        body * {
          visibility: hidden !important;
        }

        #daily-report-print-root,
        #daily-report-print-root * {
          visibility: visible !important;
        }

        /* ----------------------------------------------------------
           SCREEN-ONLY ELEMENTS
           ---------------------------------------------------------- */

        .daily-report-no-print,
        .daily-report-screen-only {
          display: none !important;
        }

        /* ----------------------------------------------------------
           PRINT-ONLY ELEMENTS
           ---------------------------------------------------------- */

        .daily-report-print-only {
          display: block !important;
        }

        /* ----------------------------------------------------------
           MAIN
           ---------------------------------------------------------- */

        main {
          display: block !important;

          width: 100% !important;
          min-width: 0 !important;
          min-height: 0 !important;

          margin: 0 !important;
          padding: 0 !important;

          overflow: visible !important;

          background: #fff !important;
        }

        /* ==========================================================
           REPORT ROOT
           ========================================================== */

        #daily-report-print-root {
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

          background: #fff !important;
          color: #2b1e1a !important;
        }

        #daily-report-print-root,
        #daily-report-print-root * {
          box-sizing: border-box !important;
        }

        /* ==========================================================
           REPORT CONTENT
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
        }

        #daily-report-print-root .daily-report-content > * {
          width: 100% !important;
          min-width: 0 !important;
          max-width: none !important;

          height: auto !important;
          max-height: none !important;

          overflow: visible !important;
        }

        #daily-report-print-root
          .daily-report-content
          > :not(:last-child) {
          margin-bottom: 4mm !important;
        }

        /* ==========================================================
           REPORT SECTIONS
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

          margin-top: 0 !important;
          margin-bottom: 4mm !important;

          padding-top: 0 !important;
          padding-right: 0 !important;
          padding-left: 0 !important;
          padding-bottom: 4mm !important;

          overflow: visible !important;

          border: 0 !important;
          border-bottom: 1px solid #ded8d4 !important;
          border-radius: 0 !important;

          background: #fff !important;
          box-shadow: none !important;

          break-inside: auto !important;
          page-break-inside: auto !important;
        }

        /* ==========================================================
           SECTION HEADERS
           ========================================================== */

        #daily-report-print-root
          .daily-report-content
          h2 {
          color: #2b1e1a !important;

          font-size: 11pt !important;
          line-height: 1.25 !important;
          font-weight: 700 !important;

          margin-top: 0 !important;
          margin-bottom: 2mm !important;

          white-space: normal !important;
          word-break: normal !important;
          overflow-wrap: break-word !important;
        }

        #daily-report-print-root
          .daily-report-content
          h3 {
          font-size: 9pt !important;
          line-height: 1.3 !important;

          margin-top: 0 !important;
          margin-bottom: 1.5mm !important;
        }

        #daily-report-print-root
          .daily-report-content
          section
          > div.flex.items-center.gap-3 {
          width: 100% !important;

          padding: 0 0 2mm !important;

          border-color: #e8e2de !important;
        }

        #daily-report-print-root h1,
        #daily-report-print-root h2,
        #daily-report-print-root h3,
        #daily-report-print-root h4 {
          break-after: avoid-page !important;
          page-break-after: avoid !important;
        }

        /* ==========================================================
           GENERIC PRINT VISIBILITY / LAYOUT FIXES
           ========================================================== */

        #daily-report-print-root
          [class*="hidden"] {
          /*
           * Do NOT globally use display:block here.
           *
           * Tailwind "hidden" can exist on legitimate elements.
           * Instead, the explicit report print elements below
           * control what must be rendered.
           */
        }

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
          [class*="h-full"] {
          height: auto !important;
        }

        #daily-report-print-root
          [class*="min-h-screen"] {
          min-height: 0 !important;
        }

        /* ==========================================================
           FINANCIAL SNAPSHOT
           ========================================================== */

        #daily-report-print-root
          .daily-report-financial-grid {
          display: grid !important;

          width: 100% !important;
          min-width: 0 !important;

          grid-template-columns:
            repeat(4, minmax(0, 1fr)) !important;

          gap: 3mm !important;
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

          background: #fff !important;
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
          [class*="text-white"] {
          color: #2b1e1a !important;
        }

        #daily-report-print-root
          .daily-report-metric-card
          p {
          margin-top: 1mm !important;

          font-size: 8pt !important;
          line-height: 1.3 !important;

          white-space: normal !important;
          overflow-wrap: break-word !important;
        }

        #daily-report-print-root
          .daily-report-metric-card
          p:first-child {
          color: #6b5b55 !important;

          font-size: 7pt !important;
        }

        /* ==========================================================
           MONEY FLOW
           ========================================================== */

        #daily-report-print-root
          .daily-report-money-flow {
          width: 100% !important;
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
           PAYMENT BREAKDOWN
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
           PRINT TABLES
           ========================================================== */

        #daily-report-print-root
          .daily-report-print-table {
          display: table !important;

          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;

          height: auto !important;
          max-height: none !important;

          margin: 0 !important;
          padding: 0 !important;

          border-collapse: collapse !important;
          border-spacing: 0 !important;

          table-layout: fixed !important;

          font-size: 8pt !important;
          line-height: 1.3 !important;

          overflow: visible !important;
        }

        #daily-report-print-root
          .daily-report-print-table
          thead {
          display: table-header-group !important;
        }

        #daily-report-print-root
          .daily-report-print-table
          tbody {
          display: table-row-group !important;
        }

        #daily-report-print-root
          .daily-report-print-table
          tfoot {
          display: table-footer-group !important;
        }

        #daily-report-print-root
          .daily-report-print-table
          tr {
          display: table-row !important;

          height: auto !important;
          max-height: none !important;

          visibility: visible !important;

          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }

        #daily-report-print-root
          .daily-report-print-table
          th {
          display: table-cell !important;

          padding: 1.5mm !important;

          border-bottom: 1px solid #8b2635 !important;

          color: #5a3e38 !important;

          font-size: 7pt !important;
          font-weight: 700 !important;

          text-align: left !important;
          text-transform: uppercase !important;

          white-space: normal !important;
          word-break: normal !important;
          overflow-wrap: break-word !important;

          visibility: visible !important;
        }

        #daily-report-print-root
          .daily-report-print-table
          td {
          display: table-cell !important;

          padding: 1.5mm !important;

          border-bottom: 1px solid #eee9e6 !important;

          color: #2b1e1a !important;

          font-size: 8pt !important;
          line-height: 1.3 !important;

          white-space: normal !important;
          word-break: normal !important;
          overflow-wrap: break-word !important;

          vertical-align: top !important;

          visibility: visible !important;
        }

        #daily-report-print-root
          .daily-report-print-table
          th:first-child,
        #daily-report-print-root
          .daily-report-print-table
          td:first-child {
          width: 8% !important;
        }

        /* ==========================================================
           NORMAL TABLES
           ========================================================== */

        #daily-report-print-root
          .daily-report-content
          table {
          display: table !important;

          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;

          height: auto !important;
          max-height: none !important;

          margin: 0 !important;
          padding: 0 !important;

          border-collapse: collapse !important;
          border-spacing: 0 !important;

          overflow: visible !important;

          table-layout: auto !important;
        }

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

        #daily-report-print-root
          .daily-report-content
          table
          tr {
          display: table-row !important;

          height: auto !important;
          max-height: none !important;

          visibility: visible !important;

          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }

        #daily-report-print-root
          .daily-report-content
          table
          th,
        #daily-report-print-root
          .daily-report-content
          table
          td {
          display: table-cell !important;

          white-space: normal !important;
          word-break: normal !important;
          overflow-wrap: break-word !important;

          vertical-align: top !important;

          visibility: visible !important;
        }

        /* ==========================================================
           TABLE WRAPPERS

           A common problem is:

             div.overflow-x-auto
               table
                 tbody
                   rows

           The browser can otherwise keep the wrapper's screen
           dimensions during printing.
           ========================================================== */

        #daily-report-print-root
          table
          + * {
          max-height: none !important;
        }

        #daily-report-print-root
          .daily-report-content
          table
          tbody
          tr
          td
          > div {
          max-width: 100% !important;
          max-height: none !important;
          overflow: visible !important;
        }

        /* ==========================================================
           EXPLICIT PRINT TABLE ROWS

           These selectors are useful when components use a
           dedicated print table with custom row classes.
           ========================================================== */

        #daily-report-print-root
          .daily-report-print-table
          .daily-report-print-row {
          display: table-row !important;

          visibility: visible !important;

          height: auto !important;
          max-height: none !important;

          overflow: visible !important;
        }

        #daily-report-print-root
          .daily-report-print-table
          .daily-report-print-cell {
          display: table-cell !important;

          visibility: visible !important;

          height: auto !important;
          max-height: none !important;

          overflow: visible !important;
        }

        /* ==========================================================
           CATEGORY / EXPENSE REPORT CONTENT

           IMPORTANT:
           Do not hide the screen content globally.

           The previous version contained:

             display: none

           for these classes, which could remove the actual data
           needed by the printed report.
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

          max-height: none !important;

          overflow: visible !important;
        }

        /* ==========================================================
           REPORT DATA
           ========================================================== */

        #daily-report-print-root
          .daily-report-data-section {
          width: 100% !important;

          min-width: 0 !important;
          max-width: none !important;

          height: auto !important;
          max-height: none !important;

          overflow: visible !important;
        }

        #daily-report-print-root
          .daily-report-data-section
          > div:last-child
          p {
          font-size: 7pt !important;
          line-height: 1.35 !important;

          white-space: normal !important;
          overflow-wrap: break-word !important;
        }

        /* ==========================================================
           PRODUCT / CATEGORY / EXPENSE LISTS

           Remove common screen-only constraints without forcing
           arbitrary display modes on the whole component.
           ========================================================== */

        #daily-report-print-root
          .daily-report-product-list,
        #daily-report-print-root
          .daily-report-category-list,
        #daily-report-print-root
          .daily-report-expense-list {
          width: 100% !important;

          height: auto !important;
          max-height: none !important;

          overflow: visible !important;
        }

        /* ==========================================================
           INVENTORY / STOCK ALERTS
           ========================================================== */

        #daily-report-print-root
          .daily-report-inventory,
        #daily-report-print-root
          .daily-report-stock-alerts,
        #daily-report-print-root
          .daily-report-inventory-check {
          width: 100% !important;

          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;

          overflow: visible !important;
        }

        /* ==========================================================
           FLEX / GRID CHILDREN

           Prevent long content from becoming wider than A4.
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

        /* ==========================================================
           TEXT
           ========================================================== */

        #daily-report-print-root
          p,
        #daily-report-print-root
          span,
        #daily-report-print-root
          div {
          overflow-wrap: break-word !important;
        }

        /* Do not split words character-by-character. */
        #daily-report-print-root
          h1,
        #daily-report-print-root
          h2,
        #daily-report-print-root
          h3,
        #daily-report-print-root
          h4,
        #daily-report-print-root
          th,
        #daily-report-print-root
          td {
          word-break: normal !important;
        }

        /* ==========================================================
           FOOTER
           ========================================================== */

        #daily-report-print-root
          .daily-report-print-footer {
          display: block !important;

          width: 100% !important;

          margin-top: 5mm !important;
          padding-top: 3mm !important;

          border-color: #d7cfca !important;

          break-inside: avoid !important;
          page-break-inside: avoid !important;

          overflow: visible !important;
        }

        /* ==========================================================
           PAGE BREAK CONTROL
           ========================================================== */

        /*
         * The report is intentionally allowed to span multiple
         * A4 pages.
         */

        #daily-report-print-root
          .daily-report-content
          > section {
          break-inside: auto !important;
          page-break-inside: auto !important;
        }

        /*
         * Keep compact components together where possible.
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

        /*
         * Tables themselves may continue across pages.
         */

        #daily-report-print-root
          table {
          break-inside: auto !important;
          page-break-inside: auto !important;
        }

        /*
         * Individual rows should stay together.
         */

        #daily-report-print-root
          table
          tr {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }

        /* ==========================================================
           REMOVE SCREEN DECORATION
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

        /* ==========================================================
           PRINT COLOR NORMALIZATION
           ========================================================== */

        #daily-report-print-root
          [class*="bg-white"] {
          background: #fff !important;
        }

        /* Avoid accidental white text on white paper. */
        #daily-report-print-root
          [class*="text-white"] {
          color: #2b1e1a !important;
        }

        /* ==========================================================
           END PRINT
           ========================================================== */
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