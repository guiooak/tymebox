import { useState, type FormEvent } from 'react';
import { Button } from '../../../common/components';
import { useT } from '../../../common/services/i18n';
import {
  emailKey,
  isValidShareEmail,
  type GrantedRole,
  type Member,
} from '../domain/access';
import { useMeetingStore } from '../store';
import { Initial, RoleSelect } from './shareControls';
import styles from './share.module.css';

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

/** The "add someone" form's draft. Held by ShareModal, which stays mounted,
 * so a half-typed email survives closing and reopening the modal. */
export function usePeopleDraft() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<GrantedRole>('viewer');
  const [error, setError] = useState<string | null>(null);
  return { email, setEmail, role, setRole, error, setError };
}

/** Add someone by email with a role; the owner, then everyone it's shared with. */
export function PeopleList({
  ownerName,
  draft,
}: {
  ownerName: string;
  draft: ReturnType<typeof usePeopleDraft>;
}) {
  const t = useT().share;
  const members = useMeetingStore((state) => state.members);
  const user = useMeetingStore((state) => state.user);
  const shareWith = useMeetingStore((state) => state.shareWith);
  const { email, setEmail, role, setRole, error, setError } = draft;

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

  return (
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
          <Initial name={user?.name || ownerName} photoURL={user?.photoURL} />
          <div className={styles.personText}>
            <strong>{ownerName || user?.name}</strong>
            <span className={styles.muted}>{user?.email}</span>
          </div>
          <span className={styles.ownerTag}>{t.owner}</span>
        </li>
        {members.map((member) => (
          <MemberRow key={member.key} member={member} />
        ))}
      </ul>
    </section>
  );
}
