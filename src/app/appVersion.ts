const RELEASES = 'https://github.com/guiooak/tymebox/releases/tag/';
const RELEASE = /^\d+\.\d+\.\d+$/;

export type AppVersion = {
  /** What the sidebar shows: `v1.4.0`, `v1.4.0-pr.12`, or `dev`. */
  label: string;
  /** The GitHub Release of a released version; previews and dev have none. */
  href: string | null;
};

/** The version CI stamped on this build (VITE_APP_VERSION), for display. */
export function appVersion(raw: string | undefined): AppVersion {
  const version = raw?.trim();
  if (!version) {
    return { label: 'dev', href: null };
  }
  return {
    label: `v${version}`,
    href: RELEASE.test(version) ? `${RELEASES}v${version}` : null,
  };
}
