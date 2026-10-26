import { Select, type SelectOption } from '../../../common/components';
import { useT, type Messages } from '../../../common/services/i18n';
import type { GrantedRole } from '../domain/access';
import styles from './share.module.css';

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

export function RoleSelect({
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

/** A person's photo, or the first letter of their name. */
export function Initial({ name, photoURL }: { name: string; photoURL?: string }) {
  return photoURL ? (
    <img className={styles.avatar} src={photoURL} alt="" referrerPolicy="no-referrer" />
  ) : (
    <span className={styles.avatar} aria-hidden="true">
      {(name.trim().charAt(0) || '?').toUpperCase()}
    </span>
  );
}
