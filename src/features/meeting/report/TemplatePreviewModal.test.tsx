import { act, fireEvent, render, screen } from '@testing-library/react';
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
