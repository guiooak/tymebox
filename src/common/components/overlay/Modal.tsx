import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CloseButton } from '../buttons';
import { cx } from '../cx';
import styles from './Modal.module.css';

export type ModalProps = {
  open: boolean;
  onClose?: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
  disableCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
};

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 480,
  disableCloseButton,
  closeOnOverlayClick,
}: ModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !disableCloseButton) {
        onClose?.();
      }
    };
    document.addEventListener('keyup', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keyup', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose, disableCloseButton]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      className={styles.overlay}
      onClick={() => {
        if (closeOnOverlayClick) {
          onClose?.();
        }
      }}
    >
      <div
        className={styles.dialog}
        style={{ maxWidth: width }}
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        {!disableCloseButton && (
          // Same height as the first line below it (the title, or the text of
          // an untitled dialog), so the X centres on that line.
          <span className={cx(styles.closeSlot, title ? styles.onTitle : styles.onText)}>
            <CloseButton onClick={onClose} />
          </span>
        )}
        {title && (
          <div className={cx(styles.header, !disableCloseButton && styles.clearClose)}>
            <h3 className={styles.title}>{title}</h3>
          </div>
        )}
        <div
          className={cx(
            styles.body,
            title ? styles.belowTitle : styles.untitled,
            !title && !disableCloseButton && styles.clearClose,
          )}
        >
          {children}
        </div>
        {footer && <div className={cx(styles.footer)}>{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
