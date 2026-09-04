export function downloadCsv(filename: string, columns: string[], rows: (string | number)[][]) {
  const escapeCsv = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const content = [columns, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
  const file = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Revoking immediately can race the browser's download handoff in some
  // environments and silently drop the download — give it a moment first.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
