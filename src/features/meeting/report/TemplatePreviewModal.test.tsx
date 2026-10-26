import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DialogProvider } from '../../../common/components';
import type { Meeting } from '../domain/types';
import { TemplatePreviewModal } from './TemplatePreviewModal';

const meeting: Meeting = {
  id: 'm1',
  owner: 'u1',
  ownerName: 'Ana',
  name: 'Retro',
  description: '',
  expectedStartTime: '2026-10-17T10:00:00',
  expectedEndTime: '2026-10-17T11:00:00',
  realStartTime: '2026-10-17T10:00:00',
  realEndTime: '2026-10-17T10:50:00',
  goals: [],
  sideTopics: [],
  status: 'finished',
  createdAt: '',
  updatedAt: '',
};

function renderModal(participantEmails: string[] | null) {
  return render(
    <DialogProvider>
      <TemplatePreviewModal
        open
        onClose={() => {}}
        meeting={meeting}
        chartImageSrc={null}
        streak={0}
        participantEmails={participantEmails}
      />
    </DialogProvider>,
  );
}

describe('TemplatePreviewModal participants', () => {
  it('copies everyone’s emails, comma-separated, for the CC field', async () => {
    const writeText = vi.fn(async () => {});
    Object.assign(navigator, { clipboard: { writeText } });
    renderModal(['bruno@team.com', 'carla@team.com']);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy participants’ emails' }));
    });
    expect(writeText).toHaveBeenCalledWith('bruno@team.com, carla@team.com');
    expect(screen.getByRole('button', { name: 'Copied 2 emails!' })).toBeInTheDocument();
  });

  it('is disabled when nobody else has access', () => {
    renderModal([]);
    expect(
      screen.getByRole('button', { name: 'Copy participants’ emails' }),
    ).toBeDisabled();
  });

  it('is hidden for anyone who can’t see the participants', () => {
    renderModal(null);
    expect(screen.queryByRole('button', { name: /participants/ })).toBeNull();
  });
});

describe('TemplatePreviewModal copying', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('copies the report as rich HTML and plain text, then says so for a moment', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('ClipboardItem', vi.fn());
    const write = vi.fn(async () => {});
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      writable: true,
      value: { write, writeText: vi.fn() },
    });
    renderModal(null);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy to Email' }));
    });
    expect(write).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Copied!' })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByRole('button', { name: 'Copy to Email' })).toBeInTheDocument();
  });

  it('says so when the browser blocks the clipboard', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      writable: true,
      value: {
        writeText: vi.fn(async () => {
          throw new Error('blocked');
        }),
      },
    });
    renderModal(['bruno@team.com']);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy to Email' }));
    });
    expect(
      screen.getByText('Couldn’t copy. Your browser blocked the clipboard.'),
    ).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy participants’ emails' }));
    });
    expect(screen.getByText(/Couldn’t copy/)).toBeInTheDocument();
  });

  it('counts down the copied emails, and closes', async () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(
      <DialogProvider>
        <TemplatePreviewModal
          open
          onClose={onClose}
          meeting={meeting}
          chartImageSrc={null}
          streak={0}
          participantEmails={['bruno@team.com']}
        />
      </DialogProvider>,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy participants’ emails' }));
    });
    expect(screen.getByRole('button', { name: 'Copied 1 email!' })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(2000));
    expect(
      screen.getByRole('button', { name: 'Copy participants’ emails' }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Close' }).at(-1) as HTMLElement,
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('renders nothing while closed', () => {
    render(
      <DialogProvider>
        <TemplatePreviewModal
          open={false}
          onClose={() => {}}
          meeting={meeting}
          chartImageSrc={null}
          streak={0}
        />
      </DialogProvider>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
