import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DialogProvider } from '../overlay';
import { Form } from './Form';
import { FormDatetimePicker } from './FormDatetimePicker';
import { FormField } from './FormField';
import { FormInput } from './FormInput';
import { FormResetButton } from './FormResetButton';
import { FormSubmitButton } from './FormSubmitButton';
import { FormTextarea } from './FormTextarea';
import { TextArea } from './TextArea';

function signUp(
  props: Partial<Parameters<typeof Form>[0]> = {},
  extra?: React.ReactNode,
) {
  const onSubmit = vi.fn();
  const onReset = vi.fn();
  render(
    <DialogProvider>
      <Form onSubmit={onSubmit} onReset={onReset} className="signup" {...props}>
        <FormField label="Name" htmlFor="name">
          <FormInput id="name" name="name" required minLength={2} maxLength={10} />
        </FormField>
        <FormField label="Code" htmlFor="code">
          <FormInput
            id="code"
            name="code"
            initialValue="AB"
            validate={(value) => /^[A-Z]+$/.test(value) || 'Capitals only'}
          />
        </FormField>
        <FormField label="Bio" htmlFor="bio">
          <FormTextarea id="bio" name="bio" required ariaLabel="Bio" />
        </FormField>
        {extra}
        <FormResetButton>Clear</FormResetButton>
        <FormSubmitButton>Send</FormSubmitButton>
      </Form>
    </DialogProvider>,
  );
  return { onSubmit, onReset };
}

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('Form', () => {
  it('shows every error on submit and sends nothing until all are valid', () => {
    const { onSubmit } = signUp();
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(screen.getAllByText('This field is required')).toHaveLength(2);
    expect(onSubmit).not.toHaveBeenCalled();

    type('Name', 'A');
    expect(screen.getByText('Use at least 2 characters')).toBeInTheDocument();
    type('Name', 'Way too long a name');
    expect(screen.getByText(/at most 10/)).toBeInTheDocument();
    type('Code', 'ab');
    expect(screen.getByText('Capitals only')).toBeInTheDocument();

    type('Name', 'Ana');
    type('Code', 'XY');
    type('Bio', 'Hello');
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Ana', code: 'XY', bio: 'Hello' });
  });

  it('shows a field’s error once it is left, not before', () => {
    signUp();
    type('Name', 'A');
    expect(screen.queryByText('Use at least 2 characters')).toBeNull();
    fireEvent.blur(screen.getByLabelText('Name'));
    expect(screen.getByText('Use at least 2 characters')).toBeInTheDocument();
    fireEvent.blur(screen.getByLabelText('Bio'));
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('sends each field under its name', () => {
    const { onSubmit } = signUp();
    type('Name', 'Ana');
    type('Bio', 'Hi');
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(Object.keys(onSubmit.mock.calls[0][0]).sort()).toEqual([
      'bio',
      'code',
      'name',
    ]);
  });

  it('resets after confirming, or straight away when told', async () => {
    const { onReset } = signUp();
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'Not anymore' }));
    });
    expect(onReset).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'Yes, do it' }));
    });
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('resets without asking when confirmReset is off', async () => {
    const { onReset } = signUp({ confirmReset: false });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Clear' })));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('runs without handlers', async () => {
    signUp({ onSubmit: undefined, onReset: undefined, confirmReset: false });
    type('Name', 'Ana');
    type('Bio', 'Hi');
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Clear' })));
    expect(screen.getByLabelText('Name')).toHaveValue('Ana');
  });
});

describe('fields outside a form', () => {
  it('keep their own value and error, and controlled ones report changes', () => {
    const onChange = vi.fn();
    render(
      <>
        <FormInput name="free" type="number" placeholder="Free" required />
        <FormTextarea name="ctrl" value="x" onChange={onChange} ariaLabel="Controlled" />
      </>,
    );
    const free = screen.getByPlaceholderText('Free');
    expect(free).toHaveAttribute('type', 'number');
    fireEvent.change(free, { target: { value: '5' } });
    expect(free).toHaveValue(5);
    fireEvent.change(free, { target: { value: '' } });
    fireEvent.blur(free);
    expect(free.className).toMatch(/invalid/);
    fireEvent.change(screen.getByLabelText('Controlled'), { target: { value: 'xy' } });
    expect(onChange).toHaveBeenCalledWith('xy');
  });

  it('show a date picker’s error under it', () => {
    render(<FormDatetimePicker value="" onChange={() => {}} error="Pick a time" />);
    expect(screen.getByText('Pick a time')).toBeInTheDocument();
  });

  it('mark an invalid text area', () => {
    render(<TextArea value="" onChange={() => {}} ariaLabel="Notes" invalid />);
    expect(screen.getByLabelText('Notes').className).toMatch(/invalid/);
  });
});
