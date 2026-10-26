/*
 * The two Node APIs the e2e code uses, declared here so the project doesn't
 * need @types/node (Playwright runs these files in Node).
 */
declare const process: { env: Record<string, string | undefined> };

declare module 'node:fs/promises' {
  export function readFile(path: string, encoding: 'utf8'): Promise<string>;
}
