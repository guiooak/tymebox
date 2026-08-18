import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useKeyboardShortcuts, type Shortcut } from './useKeyboardShortcuts';

function Harness({ shortcuts, enabled }: { shortcuts: Shortcut[]; enabled?: boolean }) {
  useKeyboardShortcuts(shortcuts, enabled);
  return <input aria-label="field" />;
}

const press = (key: string, target: EventTarget = document.body) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

describe('useKeyboardShortcuts', () => {
  it('fires a matching shortcut, case-insensitively', () => {
    const onTrigger = vi.fn();
    render(<Harness shortcuts={[{ key: 'd', description: 'done', onTrigger }]} />);

    press('D');

    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it('ignores disabled shortcuts and non-matching keys', () => {
    const onTrigger = vi.fn();
    render(
      <Harness
        shortcuts={[{ key: 'd', description: 'done', onTrigger, disabled: true }]}
      />,
    );

    press('d');
    press('x');

    expect(onTrigger).not.toHaveBeenCalled();
  });

  it('does not fire while typing in a field', () => {
    const onTrigger = vi.fn();
    const { getByLabelText } = render(
      <Harness shortcuts={[{ key: 'd', description: 'done', onTrigger }]} />,
    );

    press('d', getByLabelText('field'));

    expect(onTrigger).not.toHaveBeenCalled();
  });

  it('does nothing when disabled as a whole', () => {
    const onTrigger = vi.fn();
    render(
      <Harness
        shortcuts={[{ key: 'd', description: 'done', onTrigger }]}
        enabled={false}
      />,
    );

    press('d');

    expect(onTrigger).not.toHaveBeenCalled();
  });
});
