import { format } from 'date-fns';
import { formatGeneratedAt, type ReportData } from '@/lib/reports/build-report-data';

// A4 portrait, millimetres.
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_SPACE = 22; // keep content clear of the footer

const EMERALD: [number, number, number] = [16, 185, 129];
const INK: [number, number, number] = [16, 24, 39];
const MUTED: [number, number, number] = [100, 116, 139];
const LIGHT_ROW: [number, number, number] = [240, 253, 244];
const LABEL_FILL: [number, number, number] = [248, 250, 252];

/**
 * jsPDF's built-in Helvetica only covers Latin-1 (plus a few typographic marks), so anything
 * else, such as emoji a farmer typed or the cedi sign, would print as garbage. Map common
 * characters to safe equivalents and replace the rest.
 */
function pdfSafe(text: string): string {
  return text
    .replace(/−/g, '-') // minus sign
    .replace(/₵/g, 'GHS ') // cedi sign
    .replace(/[^\n\x20-\x7E\xA0-\xFF–—‘’“”•]/g, '?');
}

/**
 * Builds a branded A4 PDF and downloads it. Pass one report, or several to get one combined
 * "complete financial file" (each report starts on a new page). jsPDF is loaded only on demand.
 */
export async function generateReportPDF(input: ReportData | ReportData[]): Promise<void> {
  const reports = Array.isArray(input) ? input : [input];
  if (reports.length === 0) return;
  // Lazy-load: these libraries are large and only needed when a report is downloaded.
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setFont('helvetica', 'normal');
  let y = 0;

  /** Runs autoTable and moves `y` below wherever the table ended (possibly on a later page). */
  const table = (options: Parameters<typeof autoTable>[1]) => {
    autoTable(doc, {
      margin: { left: MARGIN, right: MARGIN, top: 18, bottom: FOOTER_SPACE },
      ...options,
      didDrawPage: (hook) => {
        if (hook.cursor) y = hook.cursor.y;
      },
    });
    y += 8;
  };

  /** Starts a new page when fewer than `needed` mm remain above the footer. */
  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_H - FOOTER_SPACE) {
      doc.addPage();
      y = 20;
    }
  };

  const heading = (text: string) => {
    ensureSpace(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    doc.text(pdfSafe(text), MARGIN, y);
    y += 5;
  };

  /** Draws one report, starting at the top of the current page. */
  const drawReport = (data: ReportData) => {
    // ---------- Header band ----------
    doc.setFillColor(...EMERALD);
    doc.rect(0, 0, PAGE_W, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('AgriCtec', MARGIN, 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Digital Financial Identity Report', MARGIN, 22);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(pdfSafe(data.title), PAGE_W - MARGIN, 17, { align: 'right' });

    // ---------- Farmer block ----------
    y = 38;
    const farmerField = (label: string, value: string, x: number, rowY: number) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(label.toUpperCase(), x, rowY);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...INK);
      doc.text(pdfSafe(value), x, rowY + 4.5, { maxWidth: 58 });
    };
    farmerField('Farmer', data.farmer.name, MARGIN, y);
    farmerField('Phone', data.farmer.phone, MARGIN + 64, y);
    farmerField('Farm', data.farmer.farm, MARGIN, y + 12);
    farmerField('Farm size', data.farmer.acres, MARGIN + 64, y + 12);
    farmerField('Region', data.farmer.region, MARGIN, y + 24);
    farmerField('Constituency', data.farmer.constituency, MARGIN + 64, y + 24);
    farmerField('Community', data.farmer.community, MARGIN, y + 36);
    farmerField('Crops', data.farmer.crops, MARGIN + 64, y + 36);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text('GENERATED', PAGE_W - MARGIN, y, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(formatGeneratedAt(data.generatedAt), PAGE_W - MARGIN, y + 4.5, { align: 'right' });

    y += 45;
    doc.setDrawColor(226, 232, 240);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 9;

    // ---------- Summary: label/value pairs, two per row ----------
    heading('Summary');
    const pairs: string[][] = [];
    for (let i = 0; i < data.summary.length; i += 2) {
      const a = data.summary[i];
      const b = data.summary[i + 1];
      pairs.push([
        pdfSafe(a.label),
        pdfSafe(a.value),
        pdfSafe(b?.label ?? ''),
        pdfSafe(b?.value ?? ''),
      ]);
    }
    table({
      startY: y,
      body: pairs,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 9,
        cellPadding: 2.6,
        textColor: INK,
        lineColor: [226, 232, 240],
      },
      columnStyles: {
        0: { fillColor: LABEL_FILL, textColor: MUTED, cellWidth: CONTENT_W * 0.22 },
        1: { fontStyle: 'bold', cellWidth: CONTENT_W * 0.28 },
        2: { fillColor: LABEL_FILL, textColor: MUTED, cellWidth: CONTENT_W * 0.22 },
        3: { fontStyle: 'bold', cellWidth: CONTENT_W * 0.28 },
      },
    });

    // ---------- Line items ----------
    if (data.table) {
      const { title, headers, rows, align, totalRow } = data.table;
      heading(title);
      const columnStyles = Object.fromEntries(
        align.map((a, i) => [
          i,
          { halign: a === 'right' ? ('right' as const) : ('left' as const) },
        ]),
      );
      table({
        startY: y,
        head: [headers.map(pdfSafe)],
        body: rows.length
          ? rows.map((row) => row.map(pdfSafe))
          : [
              [
                {
                  content: 'No entries recorded yet.',
                  colSpan: headers.length,
                  styles: { halign: 'center', textColor: MUTED },
                },
              ],
            ],
        foot: totalRow ? [totalRow.map(pdfSafe)] : undefined,
        showHead: 'everyPage', // repeat the header row when the table flows onto a new page
        showFoot: 'lastPage',
        theme: 'striped',
        styles: { font: 'helvetica', fontSize: 9, cellPadding: 2.4, textColor: INK },
        headStyles: { fillColor: EMERALD, textColor: [255, 255, 255], fontStyle: 'bold' },
        footStyles: { fillColor: [209, 250, 229], textColor: INK, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: LIGHT_ROW },
        columnStyles,
        didParseCell: (cell) => {
          // Align header/footer cells with their column (e.g. amounts on the right).
          if (cell.section !== 'body' && align[cell.column.index] === 'right') {
            cell.cell.styles.halign = 'right';
          }
        },
      });
    }

    // ---------- Narrative sections ----------
    for (const section of data.sections ?? []) {
      heading(section.heading);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85);
      const lines: string[] = doc.splitTextToSize(pdfSafe(section.body), CONTENT_W);
      for (const line of lines) {
        ensureSpace(5);
        doc.text(line, MARGIN, y);
        y += 4.6;
      }
      y += 5;
    }
  };

  reports.forEach((data, i) => {
    if (i > 0) doc.addPage();
    drawReport(data);
  });

  // ---------- Footer on every page ----------
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setDrawColor(226, 232, 240);
    doc.line(MARGIN, PAGE_H - 16, PAGE_W - MARGIN, PAGE_H - 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`Generated by AgriCtec • Page ${page} of ${pages}`, MARGIN, PAGE_H - 11);
    doc.text(
      'Figures are self-reported by the farmer and have not been independently verified.',
      MARGIN,
      PAGE_H - 7,
    );
  }

  const name =
    reports.length === 1 ? reports[0].title.replace(/\s+/g, '_') : 'Complete_Financial_File';
  doc.save(`AgriCtec_${name}_${format(new Date(reports[0].generatedAt), 'yyyy-MM-dd')}.pdf`);
}
