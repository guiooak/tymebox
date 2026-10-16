import colorsCss from './colors.css?raw';
import darkCss from './dark.css?raw';

/**
 * Guards the brand manual's contrast rules (manual §05) against the real token
 * files, in both themes: 4.5:1 for text, 3:1 for strokes and other graphics
 * people need to read the screen (WCAG 2.2, 1.4.3 and 1.4.11).
 */

type Tokens = Record<string, string>;

function declarations(css: string): Tokens {
  const tokens: Tokens = {};
  for (const match of css.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
    tokens[match[1]] = match[2].trim();
  }
  return tokens;
}

function resolve(tokens: Tokens, name: string, seen: string[] = []): string {
  const value = tokens[name];
  if (value === undefined) {
    throw new Error(`Token --${name} is not defined`);
  }
  const ref = /^var\(--([\w-]+)\)$/.exec(value);
  if (!ref) {
    return value;
  }
  if (seen.includes(ref[1])) {
    throw new Error(`Token cycle: ${[...seen, ref[1]].join(' → ')}`);
  }
  return resolve(tokens, ref[1], [...seen, name]);
}

function luminance(hex: string): number {
  const digits = hex.replace('#', '');
  const full = digits.length === 3 ? [...digits].map((d) => d + d).join('') : digits;
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const light = declarations(colorsCss);
const themes: Record<string, Tokens> = {
  light,
  dark: { ...light, ...declarations(darkCss) },
};

const TEXT = 4.5;
const GRAPHIC = 3;

/** [foreground, background, minimum ratio] */
const PAIRS: Array<[string, string, number]> = [
  ['tw-text', 'tw-bg', TEXT],
  ['tw-text', 'tw-surface', TEXT],
  ['tw-text', 'tw-surface-sunken', TEXT],
  ['tw-text-muted', 'tw-bg', TEXT],
  ['tw-text-muted', 'tw-surface', TEXT],
  ['tw-primary-text', 'tw-surface', TEXT],
  ['tw-primary-text', 'tw-bg', TEXT],
  ['tw-secondary-text', 'tw-surface', TEXT],
  ['tw-success-text', 'tw-surface', TEXT],
  ['tw-info-text', 'tw-surface', TEXT],
  ['tw-warning-text', 'tw-surface', TEXT],
  ['tw-danger-text', 'tw-surface', TEXT],
  ['tw-on-primary', 'tw-primary', TEXT],
  ['tw-on-primary', 'tw-primary-strong', TEXT],
  ['tw-on-secondary', 'tw-secondary', TEXT],
  ['tw-on-success', 'tw-success', TEXT],
  ['tw-on-info', 'tw-info', TEXT],
  ['tw-on-warning', 'tw-warning', TEXT],
  ['tw-on-danger', 'tw-danger', TEXT],
  ['tw-on-accent', 'tw-accent', TEXT],
  ['tw-logo', 'tw-bg', GRAPHIC],
  ['tw-logo', 'tw-surface', GRAPHIC],
  ['tw-border-strong', 'tw-surface', 1.2],
  ['tw-chart-progress', 'tw-chart-bg', GRAPHIC],
  ['tw-chart-tendency', 'tw-chart-bg', GRAPHIC],
  ['tw-chart-projection', 'tw-chart-bg', GRAPHIC],
];

describe.each(Object.entries(themes))('%s theme', (_name, tokens) => {
  it.each(PAIRS)('--%s on --%s reaches %s:1', (fg, bg, minimum) => {
    const ratio = contrast(resolve(tokens, fg), resolve(tokens, bg));
    expect(ratio).toBeGreaterThanOrEqual(minimum);
  });
});
