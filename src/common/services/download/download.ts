/** Open the browser print dialog — the "save as PDF" path for the report. */
export function printPage(): void {
  window.print();
}

/** Turn a title into a safe, readable file name stem. */
export function toFileStem(title: string, fallback = 'timebox-report'): string {
  const stem = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return stem || fallback;
}

/** Hand a blob to the browser as a file download. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Download a value as a pretty-printed JSON file. */
export function downloadJson(data: unknown, filename: string): void {
  downloadBlob(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    filename,
  );
}
