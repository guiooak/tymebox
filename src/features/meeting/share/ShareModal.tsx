import { useState, type FormEvent } from 'react';
import { Button, Modal, Select, type SelectOption } from '../../../common/components';
import { useT, type Messages } from '../../../common/services/i18n';
import { eventPath } from '../../../common/services/router';
import {
  emailKey,
  isValidShareEmail,
  type AccessRequest,
  type GrantedRole,
  type Member,
  type Visibility,
} from '../domain/access';
import { useMeetingStore } from '../store';
import styles from './share.module.css';

export type ShareModalProps = {
  open: boolean;
  onClose: () => void;
};

/** Full link to the event, for pasting anywhere. */
export function eventLink(id: string): string {
  return `${window.location.origin}${eventPath(id)}`;
}

function roleOptions(t: Messages): SelectOption<GrantedRole>[] {
  return [
    { value: 'viewer', label: t.roles.viewer, description: t.share.viewerHint },
    {
      value: 'contributor',
      label: t.roles.contributor,
      description: t.share.contributorHint,
    },
  ];
}

function visibilityOptions(t: Messages): SelectOption<Visibility>[] {
  return [
    { value: 'private', label: t.share.privateLabel, description: t.share.privateHint },
    { value: 'public', label: t.share.publicLabel, description: t.share.publicHint },
  ];
}

function RoleSelect({
  value,
  onChange,
  label,
  size = 'md',
}: {
  value: GrantedRole;
  onChange: (role: GrantedRole) => void;
  label: string;
  /** Small next to the small buttons of a person's row. */
  size?: 'sm' | 'md';
}) {
  const t = useT();
  return (
    <Select<GrantedRole>
      value={value}
      options={roleOptions(t)}
      onChange={onChange}
      label={label}
      size={size}
    />
  );
}

function Initial({ name, photoURL }: { name: string; photoURL?: string }) {
  return photoURL ? (
    <img className={styles.avatar} src={photoURL} alt="" referrerPolicy="no-referrer" />
  ) : (
    <span className={styles.avatar} aria-hidden="true">
      {(name.trim().charAt(0) || '?').toUpperCase()}
    </span>
  );
}

function timeAgo(ms: number, t: Messages['share']): string {
  const minutes = Math.max(0, Math.round((Date.now() - ms) / 60000));
  if (minutes < 1) {
    return t.justNow;
  }
  if (minutes < 60) {
    return t.minutesAgo(minutes);
  }
  const hours = Math.round(minutes / 60);
  return hours < 24 ? t.hoursAgo(hours) : t.daysAgo(Math.round(hours / 24));
}

function RequestRow({ request }: { request: AccessRequest }) {
  const approveRequest = useMeetingStore((state) => state.approveRequest);
  const denyRequest = useMeetingStore((state) => state.denyRequest);
  const t = useT().share;
  const [role, setRole] = useState<GrantedRole>('viewer');
  const [busy, setBusy] = useState(false);

  const act = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className={styles.person}>
      <Initial name={request.name || request.email} photoURL={request.photoURL} />
      <div className={styles.personText}>
        <strong>{request.name || request.email}</strong>
        <span className={styles.muted}>
          {request.name ? `${request.email} · ` : ''}
          {timeAgo(request.requestedAt, t)}
        </span>
        {request.message && <q className={styles.message}>{request.message}</q>}
      </div>
      <div className={styles.personActions}>
        <RoleSelect
          size="sm"
          value={role}
          onChange={setRole}
          label={t.roleFor(request.email)}
        />
        <Button
          size="sm"
          disabled={busy}
          onClick={() => void act(() => approveRequest(request, role))}
        >
          {t.approve}
        </Button>
        <Button
          size="sm"
          theme="danger"
          outline
          disabled={busy}
          onClick={() => void act(() => denyRequest(request))}
        >
          {t.deny}
        </Button>
      </div>
    </li>
  );
}

function MemberRow({ member }: { member: Member }) {
  const t = useT().share;
  const setMemberRole = useMeetingStore((state) => state.setMemberRole);
  const unshare = useMeetingStore((state) => state.unshare);
  return (
    <li className={styles.person}>
      <Initial name={member.email} />
      <div className={styles.personText}>
        <strong>{member.email}</strong>
      </div>
      <div className={styles.personActions}>
        <RoleSelect
          size="sm"
          value={member.role}
          onChange={(role) => void setMemberRole(member, role)}
          label={t.roleFor(member.email)}
        />
        <Button
          size="sm"
          theme="secondary"
          outline
          aria-label={t.removeNamed(member.email)}
          onClick={() => void unshare(member)}
        >
          {t.remove}
        </Button>
      </div>
    </li>
  );
}

/**
 * The owner's sharing controls: pending requests, the link, general access
 * (private or public with a role) and the people it's shared with. Every
 * change saves at once; the database rules check it.
 */
export function ShareModal({ open, onClose }: ShareModalProps) {
  const tt = useT();
  const t = tt.share;
  const event = useMeetingStore((state) => state.event);
  const access = useMeetingStore((state) => state.access);
  const members = useMeetingStore((state) => state.members);
  const requests = useMeetingStore((state) => state.requests);
  const user = useMeetingStore((state) => state.user);
  const setVisibility = useMeetingStore((state) => state.setVisibility);
  const shareWith = useMeetingStore((state) => state.shareWith);

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<GrantedRole>('viewer');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!event || !access) {
    return null;
  }
  const link = eventLink(event.id);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const add = async (submit: FormEvent) => {
    submit.preventDefault();
    const value = email.trim();
    if (!isValidShareEmail(value)) {
      setError(t.invalidEmail);
      return;
    }
    if (user?.email && emailKey(value) === emailKey(user.email)) {
      setError(t.itsYou);
      return;
    }
    if (members.some((member) => member.key === emailKey(value))) {
      setError(t.alreadyMember);
      return;
    }
    setError(null);
    await shareWith(value, role);
    setEmail('');
  };

  const onVisibility = (visibility: Visibility) =>
    void setVisibility(visibility, access.publicRole);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t.title(event.name)}
      width={600}
      closeOnOverlayClick
      footer={<Button onClick={onClose}>{t.done}</Button>}
    >
      <div className={styles.modalBody}>
        {requests.length > 0 && (
          <section className={styles.section} aria-labelledby="share-requests">
            <h4 id="share-requests" className={styles.sectionTitle}>
              {t.requests} <span className={styles.count}>{requests.length}</span>
            </h4>
            <ul className={styles.people}>
              {requests.map((request) => (
                <RequestRow key={request.key} request={request} />
              ))}
            </ul>
          </section>
        )}

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

        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>{t.people}</h4>
          <form className={styles.addRow} onSubmit={(submit) => void add(submit)}>
            <input
              className={styles.input}
              type="email"
              value={email}
              placeholder={t.emailPlaceholder}
              aria-label={t.emailAria}
              onChange={(change) => {
                setEmail(change.target.value);
                setError(null);
              }}
            />
            <RoleSelect value={role} onChange={setRole} label={t.newPersonRole} />
            <Button type="submit">{t.add}</Button>
          </form>
          {error && <p className={styles.error}>{error}</p>}
          <p className={styles.hint}>{t.addedHint}</p>
          <ul className={styles.people}>
            <li className={styles.person}>
              <Initial name={user?.name || event.ownerName} photoURL={user?.photoURL} />
              <div className={styles.personText}>
                <strong>{event.ownerName || user?.name}</strong>
                <span className={styles.muted}>{user?.email}</span>
              </div>
              <span className={styles.ownerTag}>{t.owner}</span>
            </li>
            {members.map((member) => (
              <MemberRow key={member.key} member={member} />
            ))}
          </ul>
        </section>
      </div>
    </Modal>
  );
}
