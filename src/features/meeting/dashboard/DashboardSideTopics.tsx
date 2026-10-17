import {
  Badge,
  BlankSlate,
  Box,
  Button,
  PostIt,
  useDialog,
} from '../../../common/components';
import { useT } from '../../../common/services/i18n';
import { FIELD_LIMITS, type SideTopic } from '../domain/types';
import styles from './MeetingDashboard.module.css';

export type DashboardSideTopicsProps = {
  items: SideTopic[];
  /** Park a new topic; the parent decides which card gets focus. */
  onAdd: () => void;
  onUpdate: (key: string, value: string) => void;
  onRemove: (key: string) => void;
  /** Key of the card to focus when it appears (the one just added). */
  focusKey?: string | null;
  /** Viewers see the topics but can't add, edit or remove them. */
  readOnly?: boolean;
};

export function DashboardSideTopics({
  items,
  onAdd,
  onUpdate,
  onRemove,
  focusKey,
  readOnly,
}: DashboardSideTopicsProps) {
  const t = useT();
  const dialog = useDialog();

  // A topic left empty is dropped when the field loses focus. Judge emptiness
  // from what's in the field now, not from the last rendered copy.
  const onBlur = (item: SideTopic, value: string) => {
    if (item.key && !value.trim()) {
      onRemove(item.key);
    }
  };

  const onDelete = async (item: SideTopic) => {
    if (!item.key) {
      return;
    }
    if (!item.value.trim()) {
      onRemove(item.key);
      return;
    }
    const confirmed = await dialog.confirm({
      text: t.board.removeTopic,
      confirmButtonTheme: 'danger',
      confirmButtonText: t.common.yesDoIt,
      cancelButtonText: t.common.notAnymore,
    });
    if (confirmed) {
      onRemove(item.key);
    }
  };

  return (
    <Box className={styles.parkingLot}>
      <div className={styles.parkingHead}>
        <strong>{t.board.parkingLot}</strong>
        {!readOnly && (
          <Button size="sm" onClick={onAdd}>
            {t.board.addSideTopic}
          </Button>
        )}
      </div>
      {items.length === 0 ? (
        <BlankSlate
          art="parking"
          compact
          title={t.board.nothingParked}
          description={t.board.nothingParkedText}
        />
      ) : (
        <div className={styles.notes}>
          {items.map((item, index) => (
            <div key={item.key ?? item.id} className={styles.note}>
              <PostIt
                prefix={`${index + 1}.`}
                value={item.value}
                maxLength={FIELD_LIMITS.sideTopic}
                onChange={(value) => item.key && onUpdate(item.key, value)}
                onBlur={(value) => onBlur(item, value)}
                onDelete={() => void onDelete(item)}
                autoFocus={!!focusKey && item.key === focusKey}
                readOnly={readOnly}
              />
              {item.goalName && (
                <Badge className={styles.noteTag}>{t.board.during(item.goalName)}</Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </Box>
  );
}
