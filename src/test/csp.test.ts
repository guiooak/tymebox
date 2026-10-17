import html from '../../index.html?raw';
import firebaseJson from '../../firebase.json?raw';

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return btoa(String.fromCharCode(...new Uint8Array(digest)));
}

/*
 * The Content-Security-Policy in firebase.json allows index.html's one inline
 * script (the theme boot) by its hash. Editing that script without updating
 * the hash would get it blocked in production, so this fails first.
 */
describe('Content-Security-Policy', () => {
  const firebase = JSON.parse(firebaseJson) as {
    hosting: { headers: { headers: { key: string; value: string }[] }[] };
  };
  const csp = firebase.hosting.headers
    .flatMap((entry) => entry.headers)
    .find((header) => header.key === 'Content-Security-Policy')?.value;

  it('allows every inline script in index.html by its hash', async () => {
    const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    expect(inline.length).toBeGreaterThan(0);
    for (const script of inline) {
      const hash = await sha256(script);
      expect(csp).toContain(`'sha256-${hash}'`);
    }
  });

  it('can’t be framed and runs no plugins', () => {
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
  });
});
