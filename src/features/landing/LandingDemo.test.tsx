import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LandingDemo } from './LandingDemo';

/** One tick is 100ms on screen and 10s of the scripted event. */
const tick = (count = 1) => act(() => vi.advanceTimersByTime(100 * count));
const badge = () =>
  screen.getByText(/^(Live|Trending late|Finished)$/, { selector: 'span' });

let onIntersect: (entries: Array<{ isIntersecting: boolean }>) => void = () => {};
const disconnect = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: typeof onIntersect) {
        onIntersect = callback;
      }
      observe() {}
      disconnect = disconnect;
    },
  );
});

afterEach(() => {
  vi.useRealTimers();
});

describe('LandingDemo', () => {
  it('plays the event: live, trending late, finished early, then starts over', () => {
    render(<LandingDemo />);
    expect(screen.getByText('30:00')).toBeInTheDocument();
    expect(badge()).toHaveTextContent('Live');

    tick(135); // 22:30 in, still two milestones done
    expect(badge()).toHaveTextContent('Trending late');

    tick(33); // 28:00 in, the last one checked off
    expect(badge()).toHaveTextContent('Finished');
    expect(screen.getByText('02:00 saved')).toBeInTheDocument();

    tick(36); // holds the finished board…
    expect(badge()).toHaveTextContent('Finished');
    tick(1); // …then plays again
    expect(screen.getByText('30:00')).toBeInTheDocument();
    expect(screen.getByText('0 of 4 milestones')).toBeInTheDocument();
  });

  it('pauses off-screen and in a hidden tab', () => {
    const { unmount } = render(<LandingDemo />);
    act(() => onIntersect([{ isIntersecting: false }]));
    tick(10);
    expect(screen.getByText('30:00')).toBeInTheDocument();

    act(() => onIntersect([{ isIntersecting: true }]));
    const visibility = vi
      .spyOn(document, 'visibilityState', 'get')
      .mockReturnValue('hidden');
    tick(10);
    expect(screen.getByText('30:00')).toBeInTheDocument();
    visibility.mockRestore();
    tick(6);
    expect(screen.getByText('29:00')).toBeInTheDocument();

    unmount();
    expect(disconnect).toHaveBeenCalled();
  });
});
