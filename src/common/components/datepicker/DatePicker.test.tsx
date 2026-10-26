import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { toISO } from '../../services/datetime';
import { renderWithApp } from '../../../test/render';
import { DatePicker } from './DatePicker';

/** 14:30 local time on 10 March 2026. */
const VALUE = toISO(new Date(2026, 2, 10, 14, 30));

afterEach(() => {
  vi.useRealTimers();
});

function open(props: Partial<Parameters<typeof DatePicker>[0]> = {}) {
  const onChange = vi.fn();
  const onBlur = vi.fn();
  const view = renderWithApp(
    <div>
      <DatePicker value={VALUE} onChange={onChange} onBlur={onBlur} {...props} />
      <p>outside</p>
    </div>,
  );
  return { ...view, onChange, onBlur };
}

describe('DatePicker', () => {
  it('shows the chosen moment, or asks for one', () => {
    open();
    expect(
      screen.getByRole('button', { name: /March 10th 2026, 14:30h/ }),
    ).toBeInTheDocument();
    open({ value: '' });
    expect(
      screen.getByRole('button', { name: 'Select date & time' }),
    ).toBeInTheDocument();
  });

  it('opens a month grid, moves between months and picks a day keeping the time', () => {
    const { onChange } = open();
    fireEvent.click(screen.getByRole('button', { name: /March 10th/ }));
    expect(screen.getByText('March 2026')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByText('April 2026')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getByText('February 2026')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: '20' })[0]);
    expect(onChange).toHaveBeenCalledWith(toISO(new Date(2026, 1, 20, 14, 30)));
  });

  it('marks the selected day', () => {
    open({ defaultOpen: true });
    const selected = screen
      .getAllByRole('button', { name: '10' })
      .find((day) => day.className.includes('selected'));
    expect(selected).toBeDefined();
  });

  it('starts from now when nothing is chosen yet', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 4, 5, 9, 15));
    const { onChange } = open({ value: '', defaultOpen: true });
    expect(screen.getByText('May 2026')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: '7' })[0]);
    expect(onChange).toHaveBeenCalledWith(toISO(new Date(2026, 4, 7, 9, 15)));

    fireEvent.change(screen.getByLabelText('Time'), { target: { value: '08:05' } });
    expect(onChange).toHaveBeenLastCalledWith(toISO(new Date(2026, 4, 5, 8, 5)));
  });

  it('changes the time, ignoring an incomplete one', () => {
    const { onChange } = open({ defaultOpen: true, id: 'start' });
    const time = screen.getByLabelText('Time');
    expect(time).toHaveValue('14:30');
    expect(time).toHaveAttribute('id', 'start-time');
    fireEvent.change(time, { target: { value: '09:45' } });
    expect(onChange).toHaveBeenCalledWith(toISO(new Date(2026, 2, 10, 9, 45)));
    onChange.mockClear();
    fireEvent.change(time, { target: { value: '' } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('closes on a click elsewhere, telling the field it lost focus', () => {
    const { onBlur } = open({ defaultOpen: true });
    fireEvent.mouseDown(screen.getByText('March 2026'));
    expect(onBlur).not.toHaveBeenCalled();
    act(() => {
      fireEvent.mouseDown(screen.getByText('outside'));
    });
    expect(onBlur).toHaveBeenCalled();
    expect(screen.queryByText('March 2026')).toBeNull();
  });

  it('toggles from its button, and shows an invalid state', () => {
    open({ invalid: true });
    const trigger = screen.getByRole('button', { name: /March 10th/ });
    expect(trigger.className).toMatch(/invalid/);
    fireEvent.click(trigger);
    expect(screen.getByText('March 2026')).toBeInTheDocument();
    fireEvent.click(trigger);
    expect(screen.queryByText('March 2026')).toBeNull();
  });
});
