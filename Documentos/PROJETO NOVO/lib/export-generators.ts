import PDFDocument from 'pdfkit'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

export async function generatePdf(
  clipName: string,
  startMs: number,
  endMs: number,
  transcriptText: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const doc = new PDFDocument({ margin: 50 })

    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    doc.fontSize(18).font('Helvetica-Bold').text(clipName, { align: 'left' })
    doc.moveDown(0.5)
    doc.fontSize(11).font('Helvetica').fillColor('#555555')
      .text(`Período: ${formatMs(startMs)} → ${formatMs(endMs)}`, { align: 'left' })
    doc.moveDown(1)
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor('#cccccc').stroke()
    doc.moveDown(1)
    doc.fontSize(12).font('Helvetica').fillColor('#000000').text(transcriptText, { align: 'justify', lineGap: 4 })
    doc.moveDown(2)
    doc.fontSize(9).fillColor('#aaaaaa').text(`Gerado por TranscreveAdv — ${new Date().toLocaleDateString('pt-BR')}`, { align: 'center' })

    doc.end()
  })
}

export async function generateWord(
  clipName: string,
  startMs: number,
  endMs: number,
  transcriptText: string
): Promise<Buffer> {
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          text: clipName,
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Período: ${formatMs(startMs)} → ${formatMs(endMs)}`,
              color: '555555',
              size: 22,
            }),
          ],
        }),
        new Paragraph({ text: '' }),
        new Paragraph({
          children: [
            new TextRun({
              text: transcriptText,
              size: 24,
            }),
          ],
        }),
        new Paragraph({ text: '' }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Gerado por TranscreveAdv — ${new Date().toLocaleDateString('pt-BR')}`,
              color: 'aaaaaa',
              size: 18,
            }),
          ],
        }),
      ],
    }],
  })

  const buffer = await Packer.toBuffer(doc)
  return Buffer.from(buffer)
}
