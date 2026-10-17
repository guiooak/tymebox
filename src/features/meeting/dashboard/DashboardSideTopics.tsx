import {
  Badge,
  BlankSlate,
  Box,
  Button,
  PostIt,
  useDialog,
} from '../../../common/components';
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
      text: 'Are you sure you want to remove it?',
      confirmButtonTheme: 'danger',
      confirmButtonText: 'Yes, do it',
      cancelButtonText: 'Not anymore',
    });
    if (confirmed) {
      onRemove(item.key);
    }
  };

  return (
    <Box className={styles.parkingLot}>
      <div className={styles.parkingHead}>
        <strong>Parking lot</strong>
        {!readOnly && (
          <Button size="sm" onClick={onAdd}>
            + Add side topic
          </Button>
        )}
      </div>
      {items.length === 0 ? (
        <BlankSlate
          art="parking"
          compact
          title="Nothing parked yet"
          description="Tangents go here, so the event can keep moving."
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
                <Badge className={styles.noteTag}>during “{item.goalName}”</Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </Box>
  );
}
