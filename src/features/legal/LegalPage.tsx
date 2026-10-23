import { useEffect } from 'react';
import { Container, Page } from '../../common/components';
import type { Locale } from '../../common/services/i18n';
import { Link, paths, privacyPath, termsPath } from '../../common/services/router';
import { useAuthStore } from '../auth';
import { Logo } from '../brand';
import { LEGAL } from './contact';
import { en } from './content/en';
import { pt } from './content/pt';
import type { LegalBlock } from './content/types';
import styles from './LegalPage.module.css';

export type LegalDocKind = 'privacy' | 'terms';

const CONTENT = { 'pt-BR': pt, 'en-US': en } as const;

function Block({ block }: { block: LegalBlock }) {
  if (typeof block === 'string') {
    return <p>{block}</p>;
  }
  if ('list' in block) {
    return (
      <ul>
        {block.list.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {block.table.head.map((cell) => (
              <th key={cell} scope="col">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.table.rows.map((row) => (
            <tr key={row[0]}>
              {row.map((cell, index) => (
                <td key={index} data-label={block.table.head[index]}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The Privacy Policy or the Terms of Use. The URL sets the language
 * (/privacidade and /termos in Portuguese, /privacy and /terms in English),
 * so a shared link always opens the text it pointed to. Open signed in or out.
 */
export function LegalPage({ doc, locale }: { doc: LegalDocKind; locale: Locale }) {
  const content = CONTENT[locale];
  const text = content[doc];
  const authed = useAuthStore((state) => state.status === 'authenticated');
  const other: Locale = locale === 'pt-BR' ? 'en-US' : 'pt-BR';
  const otherPath = doc === 'privacy' ? privacyPath(other) : termsPath(other);

  useEffect(() => {
    document.title = `${text.title} · Tymebox`;
  }, [text.title]);

  return (
    <Container className={styles.wrap}>
      <div className={styles.bar}>
        {!authed && (
          <Link to={paths.home} className={styles.brand} aria-label={content.ui.home}>
            <Logo size={26} />
          </Link>
        )}
        <Link to={otherPath} className={styles.other} lang={other}>
          {content.ui.otherLanguage}
        </Link>
      </div>
      <Page>
        <article className={styles.doc} lang={locale}>
          <h1>{text.title}</h1>
          <p className={styles.updated}>{content.ui.updated(LEGAL.updated)}</p>
          <p className={styles.intro}>{text.intro}</p>
          {text.sections.length > 3 && (
            <nav className={styles.toc} aria-label={content.ui.contents}>
              <strong>{content.ui.contents}</strong>
              <ol>
                {text.sections.map((section) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`}>
                      {section.title.replace(/^\d+\.\s*/, '')}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          )}
          {text.sections.map((section) => (
            <section key={section.id} id={section.id} className={styles.section}>
              <h2>{section.title}</h2>
              {section.blocks.map((block, index) => (
                <Block key={index} block={block} />
              ))}
            </section>
          ))}
        </article>
      </Page>
      {!authed && (
        <p className={styles.home}>
          <Link to={paths.home}>{content.ui.home}</Link>
        </p>
      )}
    </Container>
  );
}
