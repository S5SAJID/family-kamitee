import {Button} from '@astryxdesign/core/Button';
import {Icon} from '@astryxdesign/core/Icon';

/**
 * One-click Paid / Pending switch for a single installment.
 * Paid = green + check ("Ada Ho Gaya"), Pending = amber + clock ("Baqi").
 * Exposed as a toggle button (aria-pressed) to assistive tech.
 */
export function InstallmentToggle({
  isPaid,
  onToggle,
  text,
  label,
  size = 'md',
  width,
}: {
  isPaid: boolean;
  onToggle: () => void;
  /** Visible text, e.g. the due date. */
  text: string;
  /** Accessible name incl. member + installment. */
  label: string;
  size?: 'sm' | 'md' | 'lg';
  width?: string | number;
}) {
  return (
    <Button
      className="kk-inst"
      aria-pressed={isPaid}
      aria-label={label}
      tooltip={label}
      size={size}
      width={width}
      label={text}
      icon={<Icon icon={isPaid ? 'check' : 'clock'} />}
      onClick={onToggle}
    />
  );
}
