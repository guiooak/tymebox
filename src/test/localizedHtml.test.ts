import html from '../../index.html?raw';
import { localizeHtml } from '../../scripts/localized-html';

const SITE = 'https://tymebox.web.app';
const bootScript = (page: string) => page.match(/<script>[\s\S]*?<\/script>/)?.[0];

describe('localizeHtml', () => {
  it('gives /pt a Portuguese head that points at its siblings', () => {
    const page = localizeHtml(html, 'pt-BR', SITE);
    expect(page).toContain('<html lang="pt-BR">');
    expect(page).toContain('<title>Tymebox — Seus eventos em caixas de tempo</title>');
    expect(page).toContain(
      '<meta property="og:title" content="Tymebox — Cada evento, na sua caixa" />',
    );
    expect(page).toMatch(/<meta name="description" content="Organize reuniões/);
    expect(page).toContain('<meta property="og:locale" content="pt_BR" />');
    expect(page).toContain(`<link rel="canonical" href="${SITE}/pt" />`);
    expect(page).toContain(`hreflang="en-US" href="${SITE}/en"`);
    expect(page).toContain(`hreflang="x-default" href="${SITE}/"`);
  });

  it('gives /en the English head', () => {
    const page = localizeHtml(html, 'en-US', SITE);
    expect(page).toContain('<html lang="en-US">');
    expect(page).toContain('<title>Tymebox — Timebox your events</title>');
    expect(page).toContain(`<link rel="canonical" href="${SITE}/en" />`);
    expect(page).toContain('<meta property="og:locale:alternate" content="pt_BR" />');
  });

  it('leaves the root as the x-default, only adding the alternates', () => {
    const page = localizeHtml(html, null, SITE);
    expect(page).toContain('<html lang="en">');
    expect(page).toContain(`hreflang="pt-BR" href="${SITE}/pt"`);
    expect(page).not.toContain('rel="canonical"');
  });

  it('keeps the inline boot script byte for byte, so its CSP hash still matches', () => {
    for (const locale of ['pt-BR', 'en-US', null] as const) {
      expect(bootScript(localizeHtml(html, locale, SITE))).toBe(bootScript(html));
    }
  });
});
