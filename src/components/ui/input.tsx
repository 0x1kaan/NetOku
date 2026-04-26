import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, readOnly, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        readOnly={readOnly}
        className={cn(
          'flex w-full rounded-none border-2 border-ink px-[14px] py-[10px] text-sm text-ink placeholder:text-ink-dim',
          'font-sans transition-shadow duration-100',
          readOnly ? 'bg-[#F0EBDE]' : 'bg-paper',
          'focus-visible:outline-none focus-visible:shadow-brutal',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';
