import type { ReactNode } from 'react';
import {
  Box,
  ItemLink,
  itemLinkAbove,
  itemLinkContainer,
  Menu,
  type MenuItem,
} from '../../../common/components';
import { cx } from '../../../common/components/cx';
import { useT } from '../../../common/services/i18n';
import styles from './EventRow.module.css';

type EventRowProps = {
  /** The event's name; an unnamed one shows as "Untitled event". */
  name: string;
  /** A line of details under the name. */
  meta: ReactNode;
  /** A click on the name. */
  onOpen: () => void;
  /** What the ⋮ menu offers. */
  menu: MenuItem[];
  /** Badges next to the name. */
  badges?: ReactNode;
  /** Badges beside the ⋮ menu. */
  aside?: ReactNode;
};

/** One event in a list: name and details on the left, badges and ⋮ on the right. */
export function EventRow({ name, meta, onOpen, menu, badges, aside }: EventRowProps) {
  const t = useT();
  const link = (
    <ItemLink onClick={onOpen}>
      <strong>{name || t.common.untitledEvent}</strong>
    </ItemLink>
  );
  return (
    <Box className={cx(styles.item, itemLinkContainer)}>
      <div className={styles.info}>
        {badges ? (
          <div className={styles.titleRow}>
            {link}
            {badges}
          </div>
        ) : (
          link
        )}
        <div className={cx(styles.meta, badges ? styles.metaSpaced : undefined)}>
          {meta}
        </div>
      </div>
      <div className={cx(styles.actions, itemLinkAbove)}>
        {aside}
        <Menu label={t.common.actionsFor(name || t.common.thisEvent)} items={menu} />
      </div>
    </Box>
  );
}
