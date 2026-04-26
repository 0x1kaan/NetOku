import { cva } from 'class-variance-authority';

/**
 * Brutalist editorial button variants.
 * Hover lifts the button (-2,-2) while shadow grows to 6px.
 * Active press translates back (+4,+4) while shadow collapses to 0.
 */
export const buttonVariants = cva(
  'group inline-flex items-center justify-center gap-2 whitespace-nowrap font-sans font-semibold tracking-[0] select-none ' +
    'border-2 border-ink rounded-none ' +
    'shadow-brutal ' +
    'transition-transform transition-[box-shadow] duration-[80ms] ' +
    'hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-brutal-lg ' +
    'active:translate-x-[4px] active:translate-y-[4px] active:shadow-none ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-cream ' +
    'disabled:pointer-events-none disabled:opacity-50 disabled:shadow-brutal-sm',
  {
    variants: {
      variant: {
        default: 'bg-ink text-white',
        ink: 'bg-ink text-white',
        primary: 'bg-primary text-white',
        pop: 'bg-pop text-ink',
        paper: 'bg-paper text-ink',
        danger: 'bg-destructive text-white',
        ghost:
          'bg-transparent text-ink border-transparent shadow-none hover:shadow-none hover:translate-x-0 hover:translate-y-0 active:translate-x-0 active:translate-y-0 hover:underline underline-offset-4',
        outline: 'bg-paper text-ink',
        secondary: 'bg-paper text-ink',
        destructive: 'bg-destructive text-white',
        success: 'bg-success text-white',
        link:
          'bg-transparent text-primary border-transparent shadow-none hover:shadow-none hover:translate-x-0 hover:translate-y-0 active:translate-x-0 active:translate-y-0 underline underline-offset-4',
      },
      size: {
        default: 'px-[18px] py-[10px] text-sm',
        sm: 'px-[14px] py-[7px] text-[13px]',
        md: 'px-[18px] py-[10px] text-sm',
        lg: 'px-[22px] py-[13px] text-[15px]',
        xl: 'px-[28px] py-[16px] text-[17px]',
        icon: 'h-10 w-10 p-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export type { VariantProps } from 'class-variance-authority';
