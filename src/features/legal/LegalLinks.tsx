import { useLocale, useT } from '../../common/services/i18n';
import { Link, privacyPath, termsPath } from '../../common/services/router';

/** "Privacy · Terms", in the interface language; for the landing footer. */
export function LegalLinks({ className }: { className?: string }) {
  const t = useT().legal;
  const locale = useLocale();
  return (
    <nav className={className} aria-label={`${t.privacy} · ${t.terms}`}>
      <Link to={privacyPath(locale)}>{t.privacy}</Link>
      <span aria-hidden="true"> · </span>
      <Link to={termsPath(locale)}>{t.terms}</Link>
    </nav>
  );
}

/** The notice under the sign-in button: signing in accepts the Terms and
 * Privacy Policy. Notice, not consent: the legal basis is the service itself. */
export function SignInNotice({ className }: { className?: string }) {
  const t = useT().legal;
  const locale = useLocale();
  return (
    <p className={className}>
      {t.noticeBefore}
      <Link to={termsPath(locale)}>{t.noticeTerms}</Link>
      {t.noticeMiddle}
      <Link to={privacyPath(locale)}>{t.noticePrivacy}</Link>
      {t.noticeAfter}
    </p>
  );
}
