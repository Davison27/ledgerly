import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-[9px] font-semibold tracking-[0.01em] cursor-pointer transition-[opacity,background-color,box-shadow,border-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-brand text-white shadow-[0_8px_20px_rgba(28,93,151,0.3)] hover:opacity-90',
        secondary:
          'border border-black/15 bg-surface text-ink-soft hover:bg-black/[0.03]',
        ghost: 'text-ink-soft hover:bg-black/[0.05]',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-[13.5px]',
        lg: 'px-5 py-[15px] text-[15px]',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);
