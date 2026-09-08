import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { formatMoney } from "./expenses";

type RGB = [number, number, number];

const BRAND_BLUE: RGB = [2, 132, 199];
const TEXT_DARK: RGB = [15, 23, 42];
const TEXT_MUTED: RGB = [100, 116, 139];
const BORDER: RGB = [226, 232, 240];
const ROW_TINT: RGB = [248, 250, 252];
const SPEND_RED: RGB = [220, 38, 38];

export type ExpenseReportRow = {
  date: string;
  description: string;
  category: string;
  submittedBy: string;
  amount: number;
  currency: string;
};

export type ExpenseReportOptions = {
  teamName: string;
  periodLabel: string;
  categoryLabel: string | undefined;
  rows: ExpenseReportRow[];
  totalSpending: number;
  currency: string;
  topCategory: { name: string; amount: number } | undefined;
  filename: string;
};

function formatGeneratedAt(date: Date) {
  const day = date.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
  const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${day}, ${time}`;
}

export function downloadExpenseReportPdf(options: ExpenseReportOptions) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;
  const generatedLabel = formatGeneratedAt(new Date());

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...BRAND_BLUE);
  doc.text("CoinTrail Report", marginX, 50);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(`Generated on ${generatedLabel}`, marginX, 64);

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...TEXT_DARK);
  doc.text(options.teamName, marginX, 98);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(...TEXT_MUTED);
  const subtitle = options.categoryLabel
    ? `${options.periodLabel} · ${options.categoryLabel}`
    : options.periodLabel;
  doc.text(subtitle, marginX, 116);

  // Summary stats
  const statY = 152;
  const statWidth = (pageWidth - marginX * 2) / 3;
  const stats: { label: string; value: string; color: RGB }[] = [
    {
      label: "TOTAL EXPENSES",
      value: formatMoney(options.totalSpending, options.currency),
      color: SPEND_RED,
    },
    { label: "TRANSACTIONS", value: String(options.rows.length), color: TEXT_DARK },
    {
      label: "TOP CATEGORY",
      value: options.topCategory ? options.topCategory.name : "—",
      color: TEXT_DARK,
    },
  ];
  stats.forEach((stat, i) => {
    const x = marginX + i * statWidth;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(stat.label, x, statY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(...stat.color);
    doc.text(stat.value, x, statY + 20);
  });

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(1);
  doc.line(marginX, statY + 36, pageWidth - marginX, statY + 36);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(`Total number of entries: ${options.rows.length}`, marginX, statY + 56);

  // Table
  autoTable(doc, {
    startY: statY + 72,
    margin: { left: marginX, right: marginX },
    head: [["Date", "Description", "Category", "Submitted By", "Amount"]],
    body: options.rows.map((row) => [
      row.date,
      row.description,
      row.category,
      row.submittedBy,
      formatMoney(row.amount, row.currency),
    ]),
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 9.5,
      textColor: TEXT_DARK,
      cellPadding: { top: 8, bottom: 8, left: 6, right: 6 },
      lineWidth: { bottom: 0.75 },
      lineColor: BORDER,
    },
    headStyles: {
      textColor: TEXT_MUTED,
      fontStyle: "bold",
      fontSize: 8.5,
      lineWidth: { bottom: 1 },
      lineColor: TEXT_DARK,
    },
    alternateRowStyles: { fillColor: ROW_TINT },
    columnStyles: { 4: { halign: "right" } },
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  doc.setDrawColor(...TEXT_DARK);
  doc.setLineWidth(1);
  doc.line(pageWidth - marginX - 180, finalY + 14, pageWidth - marginX, finalY + 14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...TEXT_DARK);
  doc.text("Total", pageWidth - marginX - 180, finalY + 32);
  doc.text(formatMoney(options.totalSpending, options.currency), pageWidth - marginX, finalY + 32, {
    align: "right",
  });

  // Footer on every page
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.75);
    doc.line(marginX, pageHeight - 50, pageWidth - marginX, pageHeight - 50);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...BRAND_BLUE);
    doc.text("CoinTrail", marginX, pageHeight - 32);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(`Generated on ${generatedLabel}`, marginX, pageHeight - 20);
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - marginX, pageHeight - 20, {
      align: "right",
    });
  }

  doc.save(options.filename);
}
