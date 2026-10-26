import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithApp } from '../../../test/render';
import { InlineEdit } from './InlineEdit';

function edit(props: Partial<Parameters<typeof InlineEdit>[0]> = {}) {
  const onChange = vi.fn();
  renderWithApp(
    <InlineEdit value="Planning" label="event name" onChange={onChange} {...props} />,
  );
  return onChange;
}

describe('InlineEdit', () => {
  it('reads as text, becomes a focused field on click, and saves on Enter', () => {
    const onChange = edit();
    fireEvent.click(screen.getByRole('button', { name: 'Edit event name' }));
    const field = screen.getByRole('textbox', { name: 'event name' });
    expect(field).toHaveFocus();
    fireEvent.change(field, { target: { value: '  Sprint planning  ' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('Sprint planning');
    expect(screen.getByRole('button', { name: 'Edit event name' })).toBeInTheDocument();
  });

  it('saves on blur only when the text changed', () => {
    const onChange = edit();
    fireEvent.click(screen.getByRole('button', { name: 'Edit event name' }));
    fireEvent.blur(screen.getByRole('textbox'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('cancels on Escape and ignores other keys', () => {
    const onChange = edit();
    fireEvent.click(screen.getByRole('button', { name: 'Edit event name' }));
    const field = screen.getByRole('textbox');
    fireEvent.change(field, { target: { value: 'Other' } });
    fireEvent.keyDown(field, { key: 'a' });
    fireEvent.keyDown(field, { key: 'Escape' });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button')).toHaveTextContent('Planning');
  });

  it('as a text area, takes new lines and saves with Cmd/Ctrl+Enter', () => {
    const onChange = edit({ multiline: true, value: '' });
    fireEvent.click(screen.getByRole('button', { name: 'Edit event name' }));
    const field = screen.getByRole('textbox');
    expect(field.tagName).toBe('TEXTAREA');
    fireEvent.change(field, { target: { value: 'Line one' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.keyDown(field, { key: 'Enter', metaKey: true });
    expect(onChange).toHaveBeenCalledWith('Line one');

    fireEvent.click(screen.getByRole('button', { name: 'Edit event name' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Two' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', ctrlKey: true });
    expect(onChange).toHaveBeenLastCalledWith('Two');
  });

  it('shows a placeholder when empty, and plain text when read-only', () => {
    edit({ value: '', placeholder: 'Name this event' });
    expect(screen.getByRole('button')).toHaveTextContent('Name this event');
  });

  it('falls back to a generic placeholder', () => {
    edit({ value: '', readOnly: true });
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Click to add')).toBeInTheDocument();
  });

  it('shows the value read-only', () => {
    edit({ readOnly: true });
    expect(screen.getByText('Planning').tagName).toBe('SPAN');
  });
});
