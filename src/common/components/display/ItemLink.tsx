import type { ReactNode } from 'react';
import { cx } from '../cx';
import styles from './ItemLink.module.css';

export type ItemLinkProps = {
  children: ReactNode;
  onClick: () => void;
  className?: string;
};

/**
 * Makes a whole list item clickable while keeping one real button for the
 * keyboard and screen readers: the button wraps the item's title and its hit
 * area stretches over the item. Put it in a container with `itemLinkContainer`
 * (or any positioned box), and give other controls inside the item
 * `itemLinkAbove` so they stay clickable on their own.
 */
export function ItemLink({ children, onClick, className }: ItemLinkProps) {
  return (
    <button type="button" className={cx(styles.link, className)} onClick={onClick}>
      {children}
    </button>
  );
}

export const itemLinkContainer = styles.container;
export const itemLinkAbove = styles.above;
