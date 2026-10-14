import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
}

function Checkbox({ label, hint, className, id, ...props }: CheckboxProps) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        id={id}
        className={cn(
          'mt-0.5 h-5 w-5 shrink-0 rounded border-outline-variant text-primary focus:ring-2 focus:ring-primary/40 focus:ring-offset-0 accent-primary',
          className
        )}
        {...props}
      />
      {(label || hint) && (
        <span className="flex flex-col">
          {label && <span className="text-label-md text-on-surface">{label}</span>}
          {hint && <span className="text-label-sm text-on-surface-variant mt-0.5">{hint}</span>}
        </span>
      )}
    </label>
  );
}

export default Checkbox;
