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
});
