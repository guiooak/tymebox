import { useState, type DragEvent } from 'react';

/**
 * The drag image is a snapshot the browser takes of the dragged element, and
 * it can pick up the rows around it. Hand it a copy of just this row instead:
 * same width, off-screen, removed once the browser has taken the picture.
 */
function setDragGhost(event: DragEvent<HTMLDivElement>) {
  const row = event.currentTarget;
  const rect = row.getBoundingClientRect();
  const ghost = row.cloneNode(true) as HTMLElement;
  Object.assign(ghost.style, {
    position: 'fixed',
    top: '-10000px',
    left: '-10000px',
    width: `${rect.width}px`,
    pointerEvents: 'none',
  });
  document.body.appendChild(ghost);
  event.dataTransfer.setDragImage(
    ghost,
    event.clientX - rect.left,
    event.clientY - rect.top,
  );
  event.dataTransfer.effectAllowed = 'move';
  window.setTimeout(() => ghost.remove(), 0);
}

/**
 * Reordering goals by dragging. A row only becomes draggable while its handle
 * is held, so text in the row can still be selected.
 */
export function useGoalDragAndDrop({
  enabled,
  onReorder,
}: {
  enabled: boolean;
  onReorder?: (from: number, to: number) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [handleArmed, setHandleArmed] = useState<string | null>(null);

  const reset = () => {
    setDragIndex(null);
    setDragOverIndex(null);
    setHandleArmed(null);
  };

  const onDrop = (index: number) => {
    if (dragIndex != null && dragIndex !== index) {
      onReorder?.(dragIndex, index);
    }
    reset();
  };

  /** Spread on the row that moves. */
  const rowProps = (goalId: string, index: number) => ({
    draggable: enabled && handleArmed === goalId,
    onDragStart: (event: DragEvent<HTMLDivElement>) => {
      setDragIndex(index);
      setDragGhost(event);
    },
    onDragOver: (event: DragEvent<HTMLDivElement>) => {
      if (dragIndex == null) {
        return;
      }
      event.preventDefault();
      setDragOverIndex(index);
    },
    onDragEnd: reset,
    onDrop: (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      onDrop(index);
    },
  });

  /** Spread on the row's ⠿ handle. */
  const handleProps = (goalId: string) => ({
    onMouseDown: () => setHandleArmed(goalId),
    onMouseUp: () => setHandleArmed(null),
  });

  return {
    rowProps,
    handleProps,
    isDropTarget: (index: number) => dragOverIndex === index,
  };
}
