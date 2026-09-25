function safeText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '?')
    .replace(/([\\()])/g, '\\$1')
}

/** Creates a dependency-free, multi-page PDF using the built-in Helvetica font. */
export function createShiftReportPdf(lines: string[]): Buffer {
  const wrappedLines = lines.flatMap(line => {
    const text = String(line)
    if (text.length <= 94) return [text]
    const result: string[] = []
    for (let offset = 0; offset < text.length; offset += 94) result.push(text.slice(offset, offset + 94))
    return result
  })
  const pageLines: string[][] = []
  for (let offset = 0; offset < wrappedLines.length; offset += 48) pageLines.push(wrappedLines.slice(offset, offset + 48))
  if (!pageLines.length) pageLines.push(['Shift report'])

  const objects: Buffer[] = []
  const addObject = (body: string | Buffer) => { objects.push(Buffer.isBuffer(body) ? body : Buffer.from(body, 'binary')); return objects.length }
  const catalogId = addObject('')
  const pagesId = addObject('')
  const fontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  const boldFontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>')
  const pageIds: number[] = []

  for (const [pageIndex, page] of pageLines.entries()) {
    const commands = ['q', '0.545 0.149 0.208 rg', '0 824 595 18 re f', 'Q', 'BT']
    page.forEach((line, index) => {
      const safeLine = safeText(line)
      const y = 790 - index * 14
      if (index === 0) {
        commands.push(`/F2 10 Tf`, `1 0 0 1 50 ${y} Tm`, `(${safeLine}) Tj`)
      } else if (index === 1) {
        commands.push('/F2 15 Tf', `1 0 0 1 50 ${y - 10} Tm`, `(${safeLine}) Tj`)
      } else if (/^(SHIFT SUMMARY|PAYMENT BREAKDOWN|PRODUCTS SOLD)$/.test(safeLine)) {
        commands.push('/F2 10 Tf', '0.545 0.149 0.208 rg', `1 0 0 1 50 ${y} Tm`, `(${safeLine}) Tj`, '0.86 0.82 0.77 RG', `50 ${y - 4} m 545 ${y - 4} l S`, '0 0 0 rg')
      } else if (safeLine.includes('|')) {
        const [product, quantity, amount] = safeLine.split('|').map(value => value.trim())
        commands.push('/F1 9 Tf', `1 0 0 1 50 ${y} Tm`, `(${safeText(product)}) Tj`, `1 0 0 1 365 ${y} Tm`, `(${safeText(quantity)}) Tj`, `1 0 0 1 440 ${y} Tm`, `(${safeText(amount)}) Tj`)
      } else if (safeLine.includes(':')) {
        const separator = safeLine.indexOf(':')
        commands.push('/F1 9 Tf', `1 0 0 1 50 ${y} Tm`, `(${safeLine.slice(0, separator + 1)}) Tj`, '/F2 9 Tf', `1 0 0 1 345 ${y} Tm`, `(${safeLine.slice(separator + 1).trim()}) Tj`)
      } else if (safeLine) {
        commands.push('/F1 9 Tf', `1 0 0 1 50 ${y} Tm`, `(${safeLine}) Tj`)
      }
    })
    commands.push('0.48 0.38 0.34 rg', '/F1 8 Tf', `1 0 0 1 50 28 Tm`, '(LIYU POS  |  Shift report) Tj', `1 0 0 1 520 28 Tm`, `(Page ${pageIndex + 1}) Tj`, 'ET')
    const stream = Buffer.from(commands.join('\n'), 'binary')
    const contentId = addObject(Buffer.concat([Buffer.from(`<< /Length ${stream.length} >>\nstream\n`), stream, Buffer.from('\nendstream')]))
    pageIds.push(addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentId} 0 R >>`))
  }

  objects[catalogId - 1] = Buffer.from(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`)
  objects[pagesId - 1] = Buffer.from(`<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`)

  const chunks: Buffer[] = [Buffer.from('%PDF-1.4\n%âãÏÓ\n', 'binary')]
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
