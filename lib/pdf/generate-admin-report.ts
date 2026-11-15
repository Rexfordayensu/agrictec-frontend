// The admin's internal reports as PDF (phase A14), on the same AgriCtec letterhead as every PDF
// the API produces (backend app/domain/pdf_brand.py): the AgriCtec mark, "AgriCtec" and
// "DIGITAL IDENTITY" on the left; the document title, reference and date on the right; a green
// rule; and the footer "AgriCtec Digital Identity | Ref | Page X of Y" on every page. Its own
// arrangement below: A4 landscape, headline figures as tiles, then the tables. It stays marked
// confidential and internal, with who generated it. jsPDF is loaded only when downloading.

import { format } from 'date-fns';
import type { AdminReport } from '@/lib/admin/admin-reports';

// A4 landscape, millimetres.
const PAGE_W = 297;
const PAGE_H = 210;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;
/** Where content starts below the letterhead, and the space kept for the footer. */
const BODY_TOP = 34;
const FOOTER_SPACE = 16;

type RGB = [number, number, number];
const GREEN: RGB = [16, 130, 50]; // #108232
const GREEN_TINT: RGB = [219, 244, 231]; // #DBF4E7
const INK: RGB = [17, 24, 39]; // #111827
const MUTED: RGB = [100, 116, 139]; // #64748B
const RULE: RGB = [226, 232, 240];
const ROW_TINT: RGB = [247, 251, 249];
const RED: RGB = [185, 28, 28];

/** The official mark (public/brand/agrictec-mark.png), the same file the API prints. */
const MARK_URL = '/brand/agrictec-mark.png';

/** Helvetica covers Latin-1 only: map the cedi and dashes, replace anything else. */
const pdfSafe = (text: string | number) =>
  String(text)
    .replace(/₵/g, 'GHS ')
    .replace(/[−–—]/g, '-')
    .replace(/[^\n\x20-\x7E\xA0-\xFF‘’“”•]/g, '?');

/** The mark as a data URL, or null when it can't be loaded (the letterhead goes on without it). */
async function loadMark(): Promise<string | null> {
  try {
    const response = await fetch(MARK_URL);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** "IR-20261115-1405-PLATFORM": the report type and when it was generated. */
export const reportReference = (report: Pick<AdminReport, 'id' | 'generatedAt'>) =>
  `IR-${format(new Date(report.generatedAt), 'yyyyMMdd-HHmm')}-${report.id.toUpperCase()}`;

/** Builds the PDF and returns it as a Blob (the caller downloads it). */
export async function generateAdminReportPDF(
  report: AdminReport,
  generatedBy: string,
): Promise<Blob> {
  const [{ default: jsPDF }, { default: autoTable }, mark] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    loadMark(),
  ]);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const when = format(new Date(report.generatedAt), 'd MMM yyyy, HH:mm');
  const reference = reportReference(report);

  // ---------- Title and description ----------
  let y = BODY_TOP + 4;
  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(pdfSafe(report.title.toUpperCase()), MARGIN, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(pdfSafe(report.description), MARGIN, y, { maxWidth: CONTENT_W });
  y += 7;

  // ---------- Headline figures: tiles, up to 4 per row ----------
  const perRow = Math.min(4, Math.max(1, report.summary.length));
  const gap = 4;
  const tileW = (CONTENT_W - gap * (perRow - 1)) / perRow;
  report.summary.forEach((item, i) => {
    const col = i % perRow;
    if (i > 0 && col === 0) y += 18;
    const x = MARGIN + col * (tileW + gap);
    doc.setFillColor(...GREEN_TINT);
    doc.rect(x, y, tileW, 15, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(pdfSafe(item.label.toUpperCase()), x + 4, y + 5.5);
    doc.setFontSize(12);
    doc.setTextColor(...INK);
    doc.text(pdfSafe(item.value), x + 4, y + 11.5, { maxWidth: tileW - 8 });
  });
  y += 24;

  // ---------- Tables ----------
  for (const table of report.tables) {
    if (y > PAGE_H - FOOTER_SPACE - 24) {
      doc.addPage();
      y = BODY_TOP + 4;
    }
    // The section heading: a short green bar and the name.
    doc.setFillColor(...GREEN);
    doc.rect(MARGIN, y - 4, 1.4, 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...INK);
    doc.text(pdfSafe(table.title), MARGIN + 3.5, y);
    y += 3;
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN, top: BODY_TOP, bottom: FOOTER_SPACE },
      head: [table.headers.map(pdfSafe)],
      body: table.rows.length
        ? table.rows.map((row) => row.map(pdfSafe))
        : [[{ content: 'Nothing to show yet', colSpan: table.headers.length }]],
      theme: 'plain',
      styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2, textColor: INK, lineColor: RULE },
      headStyles: { fillColor: GREEN, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: ROW_TINT },
      columnStyles: Object.fromEntries(table.numeric.map((i) => [i, { halign: 'right' }])),
      // Number columns' headings line up with their figures.
      didParseCell: (hook) => {
        if (hook.section === 'head' && table.numeric.includes(hook.column.index)) {
          hook.cell.styles.halign = 'right';
        }
      },
      didDrawPage: (hook) => {
        if (hook.cursor) y = hook.cursor.y;
      },
    });
    y += 9;
  }

  // ---------- Letterhead and footer on every page ----------
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    const top = 9;
    // Embedded once (the alias), then reused on every page.
    if (mark) doc.addImage(mark, 'PNG', MARGIN, top, 12, 12, 'agrictec-mark', 'FAST');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(...INK);
    doc.text('Agri', MARGIN + 14, top + 6.2);
    doc.setTextColor(...GREEN);
    doc.text('Ctec', MARGIN + 14 + doc.getTextWidth('Agri'), top + 6.2);
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text('DIGITAL IDENTITY', MARGIN + 14.2, top + 10.6, { charSpace: 0.45 });

    const right = PAGE_W - MARGIN;
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text('INTERNAL REPORT', right, top + 4, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(pdfSafe(`Reference: ${reference}`), right, top + 8.5, { align: 'right' });
    doc.text(pdfSafe(`Generated ${when} by ${generatedBy}`), right, top + 12.3, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...RED);
    doc.text('CONFIDENTIAL - INTERNAL', right, top + 16.2, { align: 'right' });

    doc.setDrawColor(...GREEN);
    doc.setLineWidth(0.6);
    doc.line(MARGIN, top + 19, right, top + 19);

    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, PAGE_H - 11, right, PAGE_H - 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text('AgriCtec Digital Identity', MARGIN, PAGE_H - 6);
    doc.text(pdfSafe(`Ref ${reference}`), PAGE_W / 2, PAGE_H - 6, { align: 'center' });
    doc.text(`Page ${page} of ${pages}`, right, PAGE_H - 6, { align: 'right' });
  }

  return doc.output('blob');
}
