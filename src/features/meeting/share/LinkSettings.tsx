import { useState } from 'react';
import { Button, Select, type SelectOption } from '../../../common/components';
import { copyText } from '../../../common/services/clipboard';
import { useT, type Messages } from '../../../common/services/i18n';
import { eventPath } from '../../../common/services/router';
import type { AccessSettings, Visibility } from '../domain/access';
import { useMeetingStore } from '../store';
import { RoleSelect } from './shareControls';
import styles from './share.module.css';

/** Full link to the event, for pasting anywhere. */
export function eventLink(id: string): string {
  return `${window.location.origin}${eventPath(id)}`;
}

function visibilityOptions(t: Messages): SelectOption<Visibility>[] {
  return [
    { value: 'private', label: t.share.privateLabel, description: t.share.privateHint },
    { value: 'public', label: t.share.publicLabel, description: t.share.publicHint },
  ];
}

/** The event's link to copy, and who may open it: invited people, or anyone
 * signed in with a role. */
export function LinkSettings({
  eventId,
  access,
}: {
  eventId: string;
  access: AccessSettings;
}) {
  const tt = useT();
  const t = tt.share;
  const setVisibility = useMeetingStore((state) => state.setVisibility);
  const [copied, setCopied] = useState(false);
  const link = eventLink(eventId);

  const copy = async () => {
    try {
      await copyText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const onVisibility = (visibility: Visibility) =>
    void setVisibility(visibility, access.publicRole);

  return (
    <>
      <section className={styles.section}>
        <h4 className={styles.sectionTitle}>{t.link}</h4>
        <div className={styles.linkRow}>
          <input
            className={styles.input}
            value={link}
            readOnly
            aria-label={t.eventLink}
          />
          <Button theme="secondary" outline onClick={() => void copy()}>
            {copied ? t.copied : t.copyLink}
          </Button>
        </div>
      </section>

      <section className={styles.section}>
        <h4 className={styles.sectionTitle}>{t.generalAccess}</h4>
        <div className={styles.linkRow}>
          <Select<Visibility>
            value={access.visibility}
            options={visibilityOptions(tt)}
            onChange={onVisibility}
            label={t.generalAccess}
          />
          {access.visibility === 'public' && (
            <RoleSelect
              value={access.publicRole}
              onChange={(publicRole) => void setVisibility('public', publicRole)}
              label={t.publicRoleLabel}
            />
          )}
        </div>
        <p className={styles.hint}>
          {access.visibility === 'public'
            ? t.publicNote(tt.roles[access.publicRole])
            : t.privateNote}
        </p>
      </section>
    </>
  );
}
