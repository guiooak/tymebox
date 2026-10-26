import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DialogProvider } from './DialogProvider';
import { Menu } from './Menu';
import { Modal } from './Modal';
import { useDialog } from './useDialog';
import type { DialogApi } from './dialogContext';

const escape = () => fireEvent.keyUp(document, { key: 'Escape' });

describe('Modal', () => {
  it('is named by its title, locks the page scroll and closes on Escape', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Modal open title="Settings" onClose={onClose} footer={<button>Save</button>}>
        Body
      </Modal>,
    );
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyUp(document, { key: 'Enter' });
    expect(onClose).not.toHaveBeenCalled();
    escape();
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(
      <Modal open={false} title="Settings" onClose={onClose}>
        Body
      </Modal>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.body.style.overflow).toBe('');
  });

  it('closes on the overlay only when asked to, never from inside', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Modal open onClose={onClose}>
        Body
      </Modal>,
    );
    const overlay = screen.getByRole('dialog').parentElement as HTMLElement;
    fireEvent.click(overlay);
    expect(onClose).not.toHaveBeenCalled();

    rerender(
      <Modal open onClose={onClose} closeOnOverlayClick>
        Body
      </Modal>,
    );
    fireEvent.click(screen.getByText('Body'));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('can’t be dismissed when the close button is disabled', () => {
    const onClose = vi.fn();
    render(
      <Modal open title="Busy" onClose={onClose} disableCloseButton>
        Body
      </Modal>,
    );
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
    escape();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('works without an onClose', () => {
    render(
      <Modal open closeOnOverlayClick disableCloseButton>
        Body
      </Modal>,
    );
    fireEvent.click(screen.getByRole('dialog').parentElement as HTMLElement);
    expect(screen.getByRole('dialog')).not.toHaveAttribute('aria-labelledby');
  });
});

describe('Menu', () => {
  const items = (onSelect = vi.fn()) => [
    { label: 'Edit', onSelect },
    { label: 'Delete', onSelect, danger: true },
    { label: 'Archive', onSelect, disabled: true },
  ];
  const trigger = () => screen.getByRole('button', { name: 'Actions' });

  it('opens, runs the chosen item and closes', () => {
    const onSelect = vi.fn();
    render(<Menu items={items(onSelect)} label="Actions" />);
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger());
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menuitem', { name: 'Delete' }).className).toMatch(/danger/);
    expect(screen.getByRole('menuitem', { name: 'Archive' })).toBeDisabled();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('closes on Escape, on a click outside, or on the trigger again', () => {
    render(
      <>
        <Menu items={items()} label="Actions" />
        <p>Elsewhere</p>
      </>,
    );
    fireEvent.click(trigger());
    fireEvent.keyUp(document, { key: 'a' });
    fireEvent.mouseDown(screen.getByRole('menuitem', { name: 'Edit' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    escape();
    expect(screen.queryByRole('menu')).toBeNull();

    fireEvent.click(trigger());
    fireEvent.mouseDown(screen.getByText('Elsewhere'));
    expect(screen.queryByRole('menu')).toBeNull();

    fireEvent.click(trigger());
    fireEvent.click(trigger());
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('opens upwards when it would run under the bottom tab bar', () => {
    const bar = document.createElement('nav');
    bar.setAttribute('data-tab-bar', '');
    Object.defineProperty(bar, 'offsetHeight', { value: 64 });
    document.body.append(bar);
    const rect = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({ bottom: window.innerHeight - 40 } as DOMRect);
    render(<Menu items={items()} label="Actions" />);
    fireEvent.click(trigger());
    expect(screen.getByRole('menu').className).toMatch(/up/);
    bar.remove();
    rect.mockRestore();
  });

  it('opens downwards when there is room', () => {
    render(<Menu items={items()} label="Actions" />);
    fireEvent.click(trigger());
    expect(screen.getByRole('menu').className).not.toMatch(/up/);
  });
});

describe('DialogProvider', () => {
  let api: DialogApi;
  function Grab() {
    api = useDialog();
    return null;
  }
  const open = () =>
    render(
      <DialogProvider>
        <Grab />
      </DialogProvider>,
    );

  it('alerts with plain text and the default OK', async () => {
    open();
    let done = false;
    act(() => void api.alert('Saved').then(() => (done = true)));
    expect(screen.getByText('Saved')).toBeInTheDocument();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'OK' })));
    expect(done).toBe(true);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('alerts with a title and its own button, and closes from the X', async () => {
    open();
    let done = false;
    act(
      () =>
        void api
          .alert({
            title: 'Heads up',
            text: 'Body',
            buttonText: 'Got it',
            buttonTheme: 'danger',
          })
          .then(() => (done = true)),
    );
    expect(screen.getByRole('dialog', { name: 'Heads up' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Got it' })).toBeInTheDocument();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Close' })));
    expect(done).toBe(true);
  });

  it('confirms true or false, with default or given labels', async () => {
    open();
    let answer: boolean | undefined;
    act(() => void api.confirm({ text: 'Sure?' }).then((value) => (answer = value)));
    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: 'Confirm' })),
    );
    expect(answer).toBe(true);

    act(
      () =>
        void api
          .confirm({
            text: 'Delete?',
            confirmButtonText: 'Delete',
            cancelButtonText: 'Keep',
            confirmButtonTheme: 'danger',
          })
          .then((value) => (answer = value)),
    );
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Keep' })));
    expect(answer).toBe(false);

    act(() => void api.confirm({ text: 'Again?' }).then((value) => (answer = value)));
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    answer = true;
    await act(async () => escape());
    expect(answer).toBe(false);
  });
});

describe('useDialog', () => {
  it('needs a DialogProvider', () => {
    function Lonely() {
      useDialog();
      return null;
    }
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Lonely />)).toThrow(
      'useDialog must be used within a DialogProvider',
    );
    vi.mocked(console.error).mockRestore();
  });
});
