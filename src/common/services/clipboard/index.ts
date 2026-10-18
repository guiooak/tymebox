/**
 * Put rich content on the clipboard: HTML for mail and docs, plain text for
 * everything else. Browsers without ClipboardItem get the text only.
 */
export async function copyRich({
  html,
  text,
}: {
  html: string;
  text: string;
}): Promise<void> {
  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' }),
      }),
    ]);
    return;
  }
  await navigator.clipboard.writeText(text);
}
