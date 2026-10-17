import { useState, type FormEvent } from 'react';
import { Button, Modal } from '../../../common/components';
import { eventPath } from '../../../common/services/router';
import {
  emailKey,
  isValidShareEmail,
  ROLE_LABELS,
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

function RoleSelect({
  value,
  onChange,
  label,
}: {
  value: GrantedRole;
  onChange: (role: GrantedRole) => void;
  label: string;
}) {
  return (
    <select
      className={styles.select}
      value={value}
      aria-label={label}
      onChange={(event) => onChange(event.target.value as GrantedRole)}
    >
      <option value="viewer">{ROLE_LABELS.viewer}</option>
      <option value="contributor">{ROLE_LABELS.contributor}</option>
    </select>
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

function timeAgo(ms: number): string {
  const minutes = Math.max(0, Math.round((Date.now() - ms) / 60000));
  if (minutes < 1) {
    return 'just now';
  }
  if (minutes < 60) {
    return `${minutes} min ago`;
  }
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours} h ago` : `${Math.round(hours / 24)} d ago`;
}

function RequestRow({ request }: { request: AccessRequest }) {
  const approveRequest = useMeetingStore((state) => state.approveRequest);
  const denyRequest = useMeetingStore((state) => state.denyRequest);
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
          {timeAgo(request.requestedAt)}
        </span>
        {request.message && <q className={styles.message}>{request.message}</q>}
      </div>
      <div className={styles.personActions}>
        <RoleSelect value={role} onChange={setRole} label={`Role for ${request.email}`} />
        <Button
          size="sm"
          disabled={busy}
          onClick={() => void act(() => approveRequest(request, role))}
        >
          Approve
        </Button>
        <Button
          size="sm"
          theme="danger"
          outline
          disabled={busy}
          onClick={() => void act(() => denyRequest(request))}
        >
          Deny
        </Button>
      </div>
    </li>
  );
}

function MemberRow({ member }: { member: Member }) {
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
          value={member.role}
          onChange={(role) => void setMemberRole(member, role)}
          label={`Role for ${member.email}`}
        />
        <Button
          size="sm"
          theme="secondary"
          outline
          aria-label={`Remove ${member.email}`}
          onClick={() => void unshare(member)}
        >
          Remove
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
      setError('Enter a valid email address.');
      return;
    }
    if (user?.email && emailKey(value) === emailKey(user.email)) {
      setError('That’s you — you already own this event.');
      return;
    }
    if (members.some((member) => member.key === emailKey(value))) {
      setError('This person already has access. Change their role below.');
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
      title={`Share “${event.name}”`}
      width={600}
      closeOnOverlayClick
      footer={<Button onClick={onClose}>Done</Button>}
    >
      <div className={styles.modalBody}>
        {requests.length > 0 && (
          <section className={styles.section} aria-labelledby="share-requests">
            <h4 id="share-requests" className={styles.sectionTitle}>
              Requests <span className={styles.count}>{requests.length}</span>
            </h4>
            <ul className={styles.people}>
              {requests.map((request) => (
                <RequestRow key={request.key} request={request} />
              ))}
            </ul>
          </section>
        )}

        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>Link</h4>
          <div className={styles.linkRow}>
            <input
              className={styles.input}
              value={link}
              readOnly
              aria-label="Event link"
            />
            <Button theme="secondary" outline onClick={() => void copy()}>
              {copied ? 'Copied!' : 'Copy link'}
            </Button>
          </div>
        </section>

        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>General access</h4>
          <div className={styles.linkRow}>
            <select
              className={styles.select}
              value={access.visibility}
              aria-label="General access"
              onChange={(change) => onVisibility(change.target.value as Visibility)}
            >
              <option value="private">Private: only people added</option>
              <option value="public">Anyone with the link (signed in)</option>
            </select>
            {access.visibility === 'public' && (
              <RoleSelect
                value={access.publicRole}
                onChange={(publicRole) => void setVisibility('public', publicRole)}
                label="Role for anyone with the link"
              />
            )}
          </div>
          <p className={styles.hint}>
            {access.visibility === 'public'
              ? 'Anyone signed in who has the link can open it as a ' +
                ROLE_LABELS[access.publicRole].toLowerCase() +
                '. Public events they open appear under their Shared with me.'
              : 'Only you and the people below can open it. Others with the link can ask for access.'}
          </p>
        </section>

        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>People</h4>
          <form className={styles.addRow} onSubmit={(submit) => void add(submit)}>
            <input
              className={styles.input}
              type="email"
              value={email}
              placeholder="name@company.com"
              aria-label="Email to share with"
              onChange={(change) => {
                setEmail(change.target.value);
                setError(null);
              }}
            />
            <RoleSelect value={role} onChange={setRole} label="Role for the new person" />
            <Button type="submit">Add</Button>
          </form>
          {error && <p className={styles.error}>{error}</p>}
          <p className={styles.hint}>
            They’ll find it under Shared with me after signing in with this email. Send
            them the link so they know.
          </p>
          <ul className={styles.people}>
            <li className={styles.person}>
              <Initial name={user?.name || event.ownerName} photoURL={user?.photoURL} />
              <div className={styles.personText}>
                <strong>{event.ownerName || user?.name}</strong>
                <span className={styles.muted}>{user?.email}</span>
              </div>
              <span className={styles.ownerTag}>Owner</span>
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
