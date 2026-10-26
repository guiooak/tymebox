import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { Select, type SelectOption } from './Select';

type Fruit = 'apple' | 'banana' | 'cherry';

const OPTIONS: SelectOption<Fruit>[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana', description: 'Yellow' },
  { value: 'cherry', label: 'Cherry' },
];

function Harness({ onChange = () => {} }: { onChange?: (value: Fruit) => void }) {
  const [value, setValue] = useState<Fruit>('apple');
  return (
    <Select
      value={value}
      options={OPTIONS}
      label="Fruit"
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

const trigger = () => screen.getByRole('combobox', { name: 'Fruit' });

describe('Select', () => {
  it('shows the selected label and opens a listbox on click', () => {
    render(<Harness />);
    expect(trigger()).toHaveTextContent('Apple');
    expect(screen.queryByRole('listbox')).toBeNull();

    fireEvent.click(trigger());
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('option')).toHaveLength(3);
    expect(screen.getByRole('option', { name: /Apple/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('picks an option with the mouse and closes', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole('option', { name: /Cherry/ }));
    expect(onChange).toHaveBeenCalledWith('cherry');
    expect(trigger()).toHaveTextContent('Cherry');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('works from the keyboard', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.keyDown(trigger(), { key: 'ArrowDown' });
    expect(trigger()).toHaveAttribute(
      'aria-activedescendant',
      expect.stringMatching(/option-0$/),
    );
    fireEvent.keyDown(trigger(), { key: 'ArrowDown' });
    fireEvent.keyDown(trigger(), { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('banana');

    fireEvent.keyDown(trigger(), { key: 'Enter' });
    fireEvent.keyDown(trigger(), { key: 'End' });
    fireEvent.keyDown(trigger(), { key: ' ' });
    expect(onChange).toHaveBeenLastCalledWith('cherry');
  });

  it('jumps to an option by its first letter', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.keyDown(trigger(), { key: 'ArrowDown' });
    fireEvent.keyDown(trigger(), { key: 'c' });
    fireEvent.keyDown(trigger(), { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('cherry');
  });

  it('closes on Escape without letting the key reach a surrounding dialog', () => {
    const onDocumentKeyUp = vi.fn();
    document.addEventListener('keyup', onDocumentKeyUp);
    render(<Harness />);
    fireEvent.click(trigger());
    fireEvent.keyDown(trigger(), { key: 'Escape' });
    fireEvent.keyUp(trigger(), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onDocumentKeyUp).not.toHaveBeenCalled();
    document.removeEventListener('keyup', onDocumentKeyUp);
  });

  it('closes when clicking elsewhere, keeping the value', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.click(trigger());
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('moves with Home, End and the arrows, and closes on Tab', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.keyDown(trigger(), { key: 'x' });
    expect(screen.queryByRole('listbox')).toBeNull();
    fireEvent.keyDown(trigger(), { key: 'ArrowUp' });
    fireEvent.keyDown(trigger(), { key: 'End' });
    expect(trigger()).toHaveAttribute(
      'aria-activedescendant',
      expect.stringMatching(/-option-2$/),
    );
    fireEvent.keyDown(trigger(), { key: 'ArrowUp' });
    fireEvent.keyDown(trigger(), { key: 'Home' });
    expect(trigger()).toHaveAttribute(
      'aria-activedescendant',
      expect.stringMatching(/-option-0$/),
    );
    fireEvent.keyDown(trigger(), { key: 'z' });
    fireEvent.keyDown(trigger(), { key: ' ' });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.keyDown(trigger(), { key: 'Enter' });
    fireEvent.keyDown(trigger(), { key: 'Tab' });
    expect(screen.queryByRole('listbox')).toBeNull();
    fireEvent.keyUp(trigger(), { key: 'Escape' });
  });

  it('highlights the option under the mouse and keeps focus on the button', () => {
    render(<Harness />);
    fireEvent.click(trigger());
    const cherry = screen.getByRole('option', { name: 'Cherry' });
    fireEvent.mouseEnter(cherry);
    expect(trigger()).toHaveAttribute('aria-activedescendant', cherry.id);
    expect(fireEvent.mouseDown(cherry)).toBe(false);
    fireEvent.keyDown(trigger(), { key: 'Shift' });
    expect(trigger()).toHaveAttribute('aria-activedescendant', cherry.id);
    fireEvent.click(trigger());
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('opens above the button when there is no room below', () => {
    render(<Harness />);
    const button = trigger();
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
      top: window.innerHeight - 40,
      bottom: window.innerHeight - 10,
      left: 10,
      width: 100,
    } as DOMRect);
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(120);
    fireEvent.click(button);
    const list = screen.getByRole('listbox');
    expect(parseFloat(list.style.top)).toBeLessThan(window.innerHeight - 40);
    fireEvent(window, new Event('resize'));
    expect(list.style.minWidth).toBe('100px');
    vi.restoreAllMocks();
  });

  it('does nothing without options, and uses a given id', () => {
    render(<Select value="" options={[]} label="Empty" onChange={() => {}} id="empty" />);
    const empty = screen.getByRole('combobox', { name: 'Empty' });
    expect(empty).toHaveAttribute('id', 'empty');
    expect(empty).toHaveTextContent('');
    fireEvent.click(empty);
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});
