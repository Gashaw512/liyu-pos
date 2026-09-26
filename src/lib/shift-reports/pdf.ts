export interface ShiftReportPdfData {
  businessName: string
  branchName: string
  staffName: string
  openedAt: string
  closedAt: string
  summary: Array<{ label: string; value: string }>
  payments: Array<{ method: string; amount: number }>
  products: Array<{ name: string; quantity: number; sales: number }>
}

function pdfText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    // The built-in PDF fonts are WinAnsi-only. Drop unsupported glyphs instead
    // of printing rows of question marks when a name contains Ethiopic text.
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/[\\()]/g, '\\$&')
}

function displayText(value: unknown, fallback: string): string {
  return pdfText(value) || fallback
}

function money(value: number): string {
  const amount = Number.isFinite(value) ? value : 0
  return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`
}

/** Creates a readable, multi-page A4 shift report using built-in PDF fonts. */
export function createShiftReportPdf(report: ShiftReportPdfData): Buffer {
  const pageCommands: string[][] = []
  let commands: string[] = []
  let pageNumber = 0
  let y = 0

  const text = (value: unknown, x: number, top: number, size = 9, bold = false, color = '0.17 0.12 0.10') => {
    const safe = pdfText(value)
    if (!safe.trim()) return
    commands.push(`${color} rg`, `BT /${bold ? 'F2' : 'F1'} ${size} Tf 1 0 0 1 ${x} ${top} Tm (${safe}) Tj ET`)
  }

  const line = (x1: number, y1: number, x2: number, y2: number, color = '0.86 0.82 0.77') => {
    commands.push(`${color} RG 0.6 w ${x1} ${y1} m ${x2} ${y2} l S`)
  }

  const startPage = (continued = false) => {
    pageNumber += 1
    commands = ['q 0.545 0.149 0.208 rg 0 824 595 18 re f Q']
    text(displayText(report.businessName, 'Liyu POS'), 50, 795, 17, true, '0.17 0.12 0.10')
    text(continued ? 'WAITER / CASHIER SHIFT REPORT (CONTINUED)' : 'WAITER / CASHIER SHIFT REPORT', 50, 775, 10, true, '0.545 0.149 0.208')
    y = 750
    if (continued) {
      text(`Shift opened: ${report.openedAt}`, 50, y, 8, false, '0.35 0.29 0.27')
      y -= 20
    }
  }

  const finishPage = () => {
    commands.push('0.48 0.38 0.34 rg', `BT /F1 8 Tf 1 0 0 1 50 28 Tm (LIYU POS  |  Shift report) Tj ET`, `BT /F1 8 Tf 1 0 0 1 510 28 Tm (Page ${pageNumber}) Tj ET`)
    pageCommands.push(commands)
  }

  const ensureSpace = (required: number, continued = true) => {
    if (y - required >= 58) return
    finishPage()
    startPage(continued)
  }

  const section = (title: string) => {
    ensureSpace(40)
    y -= 4
    text(title.toUpperCase(), 50, y, 10, true, '0.545 0.149 0.208')
    line(50, y - 5, 545, y - 5)
    y -= 24
  }

  startPage()
  text(`Branch: ${displayText(report.branchName, 'Branch')}`, 50, y, 9, true)
  text(`Staff: ${displayText(report.staffName, 'Staff member')}`, 50, y - 15, 9)
  text(`Opened: ${report.openedAt}`, 50, y - 30, 9)
  text(`Closed: ${report.closedAt}`, 310, y - 30, 9)
  y -= 57

  section('Shift summary')
  const summaryRows = report.summary
  const cardHeight = 34
  for (let index = 0; index < summaryRows.length; index += 2) {
    ensureSpace(cardHeight + 8)
    const left = summaryRows[index]
    const right = summaryRows[index + 1]
    for (const [column, item] of [[0, left], [1, right]] as const) {
      if (!item) continue
      const x = column === 0 ? 50 : 305
      commands.push('0.97 0.96 0.93 rg', `${x} ${y - 23} 240 30 re f`)
      text(item.label, x + 9, y - 5, 8, false, '0.45 0.38 0.35')
      text(item.value, x + 9, y - 18, 10, true, '0.17 0.12 0.10')
    }
    y -= cardHeight + 5
  }

  section('Payment breakdown')
  if (!report.payments.length) {
    text('No completed payments recorded for this shift.', 50, y, 9, false, '0.45 0.38 0.35')
    y -= 18
  } else {
    text('PAYMENT METHOD', 50, y, 8, true, '0.45 0.38 0.35')
    text('AMOUNT', 435, y, 8, true, '0.45 0.38 0.35')
    y -= 8
    line(50, y, 545, y)
    y -= 16
    for (const payment of report.payments) {
      ensureSpace(20)
      text(payment.method, 50, y, 9)
      text(money(payment.amount), 435, y, 9, true)
      y -= 17
    }
  }

  section('Products sold')
  const drawProductHeader = () => {
    text('PRODUCT', 50, y, 8, true, '0.45 0.38 0.35')
    text('QTY SOLD', 350, y, 8, true, '0.45 0.38 0.35')
    text('SALES', 460, y, 8, true, '0.45 0.38 0.35')
    y -= 8
    line(50, y, 545, y)
    y -= 17
  }
  drawProductHeader()
  if (!report.products.length) {
    text('No sales were recorded during this shift.', 50, y, 9, false, '0.45 0.38 0.35')
    y -= 18
  } else {
    for (const product of report.products) {
      if (y < 72) {
        finishPage()
        startPage(true)
        section('Products sold (continued)')
        drawProductHeader()
      }
      const productName = pdfText(product.name) || 'Product name unavailable'
      const truncatedName = productName.length > 48 ? `${productName.slice(0, 45)}...` : productName
      text(truncatedName, 50, y, 9)
      text(product.quantity.toLocaleString('en-US', { maximumFractionDigits: 2 }), 350, y, 9)
      text(money(product.sales), 460, y, 9, true)
      y -= 17
      line(50, y + 5, 545, y + 5, '0.93 0.91 0.88')
    }
  }

  y -= 8
  text('Generated by Liyu POS', 50, y, 8, false, '0.48 0.38 0.34')
  finishPage()

  const objects: Buffer[] = []
  const addObject = (body: string | Buffer) => {
    objects.push(Buffer.isBuffer(body) ? body : Buffer.from(body, 'binary'))
    return objects.length
  }
  const catalogId = addObject('')
  const pagesId = addObject('')
  const fontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
  const boldFontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>')
  const pageIds: number[] = []

  for (const page of pageCommands) {
    const stream = Buffer.from(page.join('\n'), 'binary')
    const contentId = addObject(Buffer.concat([Buffer.from(`<< /Length ${stream.length} >>\nstream\n`), stream, Buffer.from('\nendstream')]))
    pageIds.push(addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentId} 0 R >>`))
  }

  objects[catalogId - 1] = Buffer.from(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`)
  objects[pagesId - 1] = Buffer.from(`<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`)

  const chunks: Buffer[] = [Buffer.from('%PDF-1.4\n% Shift report\n', 'binary')]
  const offsets = [0]
  let length = chunks[0].length
  objects.forEach((object, index) => {
    offsets.push(length)
    const wrapped = Buffer.concat([Buffer.from(`${index + 1} 0 obj\n`), object, Buffer.from('\nendobj\n')])
    chunks.push(wrapped)
    length += wrapped.length
  })
  const xrefOffset = length
  const xref = [`xref\n0 ${objects.length + 1}\n`, '0000000000 65535 f \n', ...offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`), `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`].join('')
  chunks.push(Buffer.from(xref))
  return Buffer.concat(chunks)
}
