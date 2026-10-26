import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SaveErrorToast } from './SaveErrorToast';

/** jsdom has no PromiseRejectionEvent; the toast only reads `reason`. */
function reject(reason: unknown) {
  act(() => {
    window.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason }));
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('SaveErrorToast', () => {
  it('ignores rejections that aren’t failed saves', () => {
    render(<SaveErrorToast />);
    reject(null);
    reject('text');
    reject(new Error('something else'));
    reject({});
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('says the server refused a change', () => {
    render(<SaveErrorToast />);
    reject({ code: 'PERMISSION_DENIED', message: 'permission_denied at /meetings' });
    expect(screen.getByRole('alert')).toHaveTextContent(/refused|permission|allowed/i);
  });

  it('says a change wasn’t saved, and hides by itself', () => {
    render(<SaveErrorToast />);
    reject({ name: 'FirebaseError' });
    expect(screen.getByRole('alert')).toHaveTextContent('Your last change wasn’t saved.');
    act(() => vi.advanceTimersByTime(8000));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('can be dismissed, and stops listening when gone', () => {
    const { unmount } = render(<SaveErrorToast />);
    reject({ code: 'unavailable', message: 'Firebase is offline' });
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('alert')).toBeNull();
    unmount();
    reject({ name: 'FirebaseError' });
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
