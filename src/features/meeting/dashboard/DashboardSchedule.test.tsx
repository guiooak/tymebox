import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toISO } from '../../../common/services/datetime';
import { renderWithApp } from '../../../test/render';
import { DashboardSchedule } from './DashboardSchedule';

const at = (day: number, hours: number, minutes = 0) =>
  toISO(new Date(2026, 2, day, hours, minutes));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 2, 10, 8, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

function schedule(start: string, end: string, readOnly = false) {
  const onChange = vi.fn();
  renderWithApp(
    <div>
      <DashboardSchedule
        expectedStartTime={start}
        expectedEndTime={end}
        onChange={onChange}
        readOnly={readOnly}
      />
      <p>elsewhere</p>
    </div>,
  );
  return onChange;
}

describe('DashboardSchedule', () => {
  it('shows today’s times short, other days in full, and the box length', () => {
    schedule(at(10, 9), at(11, 10, 30));
    expect(screen.getByRole('button', { name: 'Edit starts' })).toHaveTextContent(
      '09:00',
    );
    expect(screen.getByRole('button', { name: 'Edit ends' })).toHaveTextContent(
      /March 11th 2026/,
    );
    expect(screen.getByText(/ box$/)).toHaveTextContent('25h 30m box');
  });

  it('reads "not set" while unplanned, with no box', () => {
    schedule('', '');
    expect(screen.getAllByText('not set')).toHaveLength(2);
    expect(screen.queryByText(/box$/)).toBeNull();
  });

  it('warns when the end comes before the start', () => {
    schedule(at(10, 11), at(10, 9));
    expect(screen.getByText('End time should be after start time')).toBeInTheDocument();
  });

  it('can’t be edited read-only', () => {
    schedule(at(10, 9), at(10, 10), true);
    expect(screen.getByRole('button', { name: 'Edit starts' })).toBeDisabled();
  });

  it('saves a new day when you click away', () => {
    const onChange = schedule(at(10, 9), at(10, 10));
    fireEvent.click(screen.getByRole('button', { name: 'Edit starts' }));
    fireEvent.click(screen.getAllByRole('button', { name: '12' })[0]);
    act(() => {
      fireEvent.mouseDown(screen.getByText('elsewhere'));
    });
    expect(onChange).toHaveBeenCalledWith({ expectedStartTime: at(12, 9) });
    expect(screen.getByRole('button', { name: 'Edit starts' })).toBeInTheDocument();
  });

  it('saves the time on Enter, and keeps editing on a click inside', () => {
    const onChange = schedule(at(10, 9), at(10, 10));
    fireEvent.click(screen.getByRole('button', { name: 'Edit ends' }));
    fireEvent.mouseDown(screen.getByText('March 2026'));
    const time = screen.getByLabelText('Time');
    fireEvent.change(time, { target: { value: '11:15' } });
    fireEvent.keyDown(time, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith({ expectedEndTime: at(10, 11, 15) });
  });

  it('throws the draft away on Escape, and ignores other keys', () => {
    const onChange = schedule(at(10, 9), at(10, 10));
    fireEvent.click(screen.getByRole('button', { name: 'Edit starts' }));
    fireEvent.click(screen.getAllByRole('button', { name: '12' })[0]);
    fireEvent.keyDown(screen.getByText('March 2026'), { key: 'Enter' });
    fireEvent.keyDown(screen.getByText('March 2026'), { key: 'a' });
    expect(screen.getByText('March 2026')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByText('March 2026'), { key: 'Escape' });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByText('March 2026')).toBeNull();
  });

  it('saves when focus leaves the editor, not when it moves inside or nowhere', () => {
    const onChange = schedule(at(10, 9), at(10, 10));
    fireEvent.click(screen.getByRole('button', { name: 'Edit starts' }));
    fireEvent.click(screen.getAllByRole('button', { name: '13' })[0]);
    const time = screen.getByLabelText('Time');
    fireEvent.blur(time, { relatedTarget: null });
    fireEvent.blur(time, { relatedTarget: screen.getByText('March 2026') });
    expect(onChange).not.toHaveBeenCalled();
    act(() => {
      fireEvent.blur(time, { relatedTarget: screen.getByText('elsewhere') });
    });
    expect(onChange).toHaveBeenCalledWith({ expectedStartTime: at(13, 9) });
  });

  it('saves nothing when the value didn’t change', () => {
    const onChange = schedule(at(10, 9), at(10, 10));
    fireEvent.click(screen.getByRole('button', { name: 'Edit starts' }));
    act(() => {
      fireEvent.mouseDown(screen.getByText('elsewhere'));
    });
    expect(onChange).not.toHaveBeenCalled();
  });
});
