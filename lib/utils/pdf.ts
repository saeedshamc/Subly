import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PdfExportOptions {
  title: string;
  subtitle?: string;
  columns: string[];
  rows: (string | number)[][];
  filename: string;
}

/**
 * Renders a simple, printable PDF report from tabular data. Used for both
 * single-network results (one-row "table") and full VLSM/FLSM tables.
 */
export function exportToPdf({ title, subtitle, columns, rows, filename }: PdfExportOptions): void {
  const doc = new jsPDF({ orientation: rows.length > 0 && columns.length > 6 ? 'landscape' : 'portrait' });

  doc.setFontSize(16);
  doc.text(title, 14, 18);

  if (subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(subtitle, 14, 25);
  }

  autoTable(doc, {
    head: [columns],
    body: rows.map((r) => r.map(String)),
    startY: subtitle ? 30 : 24,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [37, 99, 235] },
    theme: 'striped',
  });

  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}
