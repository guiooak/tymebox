import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './buttons';
import { Collapse } from './display';
import { TimeDisplay } from './time';
import { Article, Label } from './typography';

describe('Button', () => {
  it('is a plain button by default, and can fill its row', () => {
    render(
      <>
        <Button>Plain</Button>
        <Button block outline theme="danger" size="lg" type="submit">
          Wide
        </Button>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Plain' })).toHaveAttribute(
      'type',
      'button',
    );
    const wide = screen.getByRole('button', { name: 'Wide' });
    expect(wide).toHaveAttribute('type', 'submit');
    expect(wide.className).toMatch(/block/);
    expect(wide.className).toMatch(/outline/);
  });
});

describe('Article and Label', () => {
  it('take their text from a prop or from children', () => {
    render(
      <>
        <Article text="From prop" />
        <Article>From children</Article>
        <Label text="Bold label" bold htmlFor="x" />
        <Label>Plain label</Label>
      </>,
    );
    expect(screen.getByText('From prop')).toBeInTheDocument();
    expect(screen.getByText('From children')).toBeInTheDocument();
    expect(screen.getByText('Bold label').className).toMatch(/bold/);
    expect(screen.getByText('Bold label')).toHaveAttribute('for', 'x');
    expect(screen.getByText('Plain label').className).not.toMatch(/bold/);
  });
});

describe('TimeDisplay', () => {
  it('replays its pulse each time the key goes up', () => {
    const { container, rerender } = render(<TimeDisplay>10:00</TimeDisplay>);
    expect(container.querySelector('[class*="pulse"]')).toBeNull();
    rerender(<TimeDisplay pulseKey={1}>10:00</TimeDisplay>);
    const first = container.querySelector('[class*="pulse"]');
    rerender(<TimeDisplay pulseKey={2}>10:00</TimeDisplay>);
    expect(container.querySelector('[class*="pulse"]')).not.toBe(first);
  });
});

describe('Collapse', () => {
  it('toggles from its title', () => {
    const onToggleOpen = vi.fn();
    render(
      <Collapse title="Details" open={false} onToggleOpen={onToggleOpen}>
        Body
      </Collapse>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Details/ }));
    expect(onToggleOpen).toHaveBeenCalledWith(true);
  });

  it('gives a custom title a separate caret, named after the title when it is text', () => {
    const onToggleOpen = vi.fn();
    const { rerender } = render(
      <Collapse
        title="Details"
        titleSlot={<input aria-label="Edit" />}
        open
        onToggleOpen={onToggleOpen}
      >
        Body
      </Collapse>,
    );
    const caret = screen.getByRole('button', { name: 'Toggle Details' });
    expect(caret).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(caret);
    expect(onToggleOpen).toHaveBeenCalledWith(false);

    rerender(
      <Collapse
        title={<b>Rich</b>}
        titleSlot={<span>Slot</span>}
        open
        onToggleOpen={onToggleOpen}
      >
        Body
      </Collapse>,
    );
    expect(screen.getByRole('button', { name: 'Toggle' })).toBeInTheDocument();
  });

  it('keeps clicks on its checkbox from toggling it', () => {
    const onToggleOpen = vi.fn();
    const onChange = vi.fn();
    render(
      <Collapse
        title="Task"
        open={false}
        onToggleOpen={onToggleOpen}
        checkbox={{ label: 'Done', checked: false, onChange }}
        actions={<button>More</button>}
        leading={<span>Handle</span>}
      >
        Body
      </Collapse>,
    );
    fireEvent.click(screen.getByLabelText('Done'));
    expect(onChange).toHaveBeenCalledWith(true);
    expect(onToggleOpen).not.toHaveBeenCalled();
    expect(screen.getByText('Handle')).toBeInTheDocument();
  });
});
