import type { Plugin } from 'vite';
import { en } from '../src/common/services/i18n/messages/en';
import { ptBR } from '../src/common/services/i18n/messages/ptBR';

/*
 * The landing's HTML per language. Link previews (WhatsApp, Slack…) and most
 * crawlers read the served HTML without running the app, so /pt and /en each
 * get an index.html with their own title, description and Open Graph tags,
 * plus hreflang links tying the three URLs together.
 */

type LandingLocale = 'pt-BR' | 'en-US';

const LANDINGS: Record<LandingLocale, { dir: string; og: string; meta: typeof en.meta }> =
  {
    'en-US': { dir: 'en', og: 'en_US', meta: en.meta },
    'pt-BR': { dir: 'pt', og: 'pt_BR', meta: ptBR.meta },
  };

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function setMeta(
  html: string,
  attribute: 'name' | 'property',
  key: string,
  value: string,
) {
  const pattern = new RegExp(`<meta\\s+${attribute}="${key}"\\s+content="[^"]*"\\s*/?>`);
  if (!pattern.test(html)) {
    throw new Error(`index.html has no <meta ${attribute}="${key}">`);
  }
  return html.replace(
    pattern,
    `<meta ${attribute}="${key}" content="${escape(value)}" />`,
  );
}

function alternates(siteUrl: string): string {
  return [
    `<link rel="alternate" hreflang="pt-BR" href="${siteUrl}/pt" />`,
    `<link rel="alternate" hreflang="en-US" href="${siteUrl}/en" />`,
    `<link rel="alternate" hreflang="x-default" href="${siteUrl}/" />`,
  ].join('\n    ');
}

/**
 * The page's HTML for one landing language, or for the root (`null`), which
 * only gains the hreflang links and stays the x-default.
 */
export function localizeHtml(
  html: string,
  locale: LandingLocale | null,
  siteUrl: string,
): string {
  if (!locale) {
    return html.replace('</head>', `  ${alternates(siteUrl)}\n  </head>`);
  }
  const { dir, og, meta } = LANDINGS[locale];
  const other = LANDINGS[locale === 'pt-BR' ? 'en-US' : 'pt-BR'].og;
  const url = `${siteUrl}/${dir}`;
  let out = html.replace(/<html lang="[^"]*">/, `<html lang="${locale}">`);
  out = out.replace(/<title>[^<]*<\/title>/, `<title>${escape(meta.title)}</title>`);
  out = setMeta(out, 'name', 'description', meta.description);
  out = setMeta(out, 'property', 'og:title', meta.ogTitle);
  out = setMeta(out, 'property', 'og:description', meta.ogDescription);
  const extra = [
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:locale" content="${og}" />`,
    `<meta property="og:locale:alternate" content="${other}" />`,
    `<link rel="canonical" href="${url}" />`,
    alternates(siteUrl),
  ].join('\n    ');
  return out.replace('</head>', `  ${extra}\n  </head>`);
}

/** Emits pt/index.html and en/index.html next to the built index.html. */
export function localizedHtml(siteUrl: string): Plugin {
  return {
    name: 'tymebox:localized-html',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const index = bundle['index.html'];
      if (!index || index.type !== 'asset') {
        return;
      }
      const html = String(index.source);
      index.source = localizeHtml(html, null, siteUrl);
      for (const locale of Object.keys(LANDINGS) as LandingLocale[]) {
        this.emitFile({
          type: 'asset',
          fileName: `${LANDINGS[locale].dir}/index.html`,
          source: localizeHtml(html, locale, siteUrl),
        });
      }
    },
  };
}
