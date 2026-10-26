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
