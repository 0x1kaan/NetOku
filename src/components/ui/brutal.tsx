/**
 * Brutalist editorial atoms used across NetOku.
 * Each atom mirrors the v2 prototype primitives (nk2-base.jsx):
 * Sticker, Tag, Chip, Rule, BigNum, Eyebrow, Avatar, Arrow.
 */
import { forwardRef, type HTMLAttributes, type ButtonHTMLAttributes, type ReactNode, type CSSProperties } from 'react';
import { cn } from '@/lib/utils';

// -------- Sticker: slightly rotated uppercase badge with a hard shadow. -------
export interface StickerProps extends HTMLAttributes<HTMLSpanElement> {
  rotate?: number;
  color?: 'pop' | 'primary-tint' | 'red' | 'red-tint' | 'green' | 'green-tint' | 'ink' | 'paper';
}

const stickerColor: Record<NonNullable<StickerProps['color']>, string> = {
  pop: 'bg-pop text-ink',
  'primary-tint': 'bg-primary-tint text-ink',
  red: 'bg-destructive text-white',
  'red-tint': 'bg-destructive-tint text-ink',
  green: 'bg-success text-white',
  'green-tint': 'bg-success-tint text-ink',
  ink: 'bg-ink text-pop',
  paper: 'bg-paper text-ink',
};

export const Sticker = forwardRef<HTMLSpanElement, StickerProps>(
  ({ className, rotate = -3, color = 'pop', style, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'inline-block px-2.5 py-1 border-2 border-ink shadow-brutal-sm',
        'font-sans text-[11px] font-bold uppercase tracking-[0.04em]',
        stickerColor[color],
        className,
      )}
      style={{ transform: `rotate(${rotate}deg)`, ...style }}
      {...props}
    >
      {children}
    </span>
  ),
);
Sticker.displayName = 'Sticker';

// -------- Tag: small colored pill with thin hard border. ---------------------
export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  color?: 'primary-tint' | 'pop' | 'paper' | 'red-tint' | 'green-tint' | 'cream' | 'ink';
  textColor?: 'ink' | 'primary' | 'destructive' | 'success' | 'white';
}

const tagBg: Record<NonNullable<TagProps['color']>, string> = {
  'primary-tint': 'bg-primary-tint',
  pop: 'bg-pop',
  paper: 'bg-paper',
  'red-tint': 'bg-destructive-tint',
  'green-tint': 'bg-success-tint',
  cream: 'bg-cream',
  ink: 'bg-ink',
};
const tagFg: Record<NonNullable<TagProps['textColor']>, string> = {
  ink: 'text-ink',
  primary: 'text-primary',
  destructive: 'text-destructive',
  success: 'text-success',
  white: 'text-white',
};

export const Tag = forwardRef<HTMLSpanElement, TagProps>(
  ({ className, color = 'primary-tint', textColor = 'primary', children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'inline-block px-2 py-[3px] border-[1.5px] border-ink',
        'font-sans text-[10px] font-bold uppercase tracking-[0.05em]',
        tagBg[color],
        tagFg[textColor],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  ),
);
Tag.displayName = 'Tag';

// -------- Chip: toggleable mini-button. -------------------------------------
export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export const Chip = forwardRef<HTMLButtonElement, ChipProps>(
  ({ className, active, type = 'button', children, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'px-3 py-[5px] border-2 border-ink font-sans text-xs font-semibold',
        active ? 'bg-ink text-white' : 'bg-paper text-ink',
        'transition-colors',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  ),
);
Chip.displayName = 'Chip';

// -------- Rule: 2px full-width ink divider. ----------------------------------
export const Rule = ({ className, style }: { className?: string; style?: CSSProperties }) => (
  <div className={cn('w-full bg-ink', className)} style={{ height: 2, ...style }} />
);

// -------- BigNum: Instrument Serif display numeral. --------------------------
export interface BigNumProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
}
export const BigNum = forwardRef<HTMLSpanElement, BigNumProps>(
  ({ className, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn('font-display leading-[0.9] tracking-[-0.03em] text-[72px]', className)}
      {...props}
    >
      {children}
    </span>
  ),
);
BigNum.displayName = 'BigNum';

// -------- Eyebrow: tiny uppercase label with arrow prefix. -------------------
export interface EyebrowProps extends HTMLAttributes<HTMLDivElement> {
  color?: 'primary' | 'ink' | 'pop' | 'muted' | 'white';
}
const eyebrowColor: Record<NonNullable<EyebrowProps['color']>, string> = {
  primary: 'text-primary',
  ink: 'text-ink',
  pop: 'text-pop',
  muted: 'text-ink-muted',
  white: 'text-white/70',
};
export const Eyebrow = forwardRef<HTMLDivElement, EyebrowProps>(
  ({ className, color = 'primary', children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'font-sans text-[12px] font-bold uppercase tracking-[0.12em]',
        eyebrowColor[color],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);
Eyebrow.displayName = 'Eyebrow';

// -------- Avatar: round initial tile with brutalist border. ------------------
export interface AvatarProps {
  name?: string;
  size?: number;
  className?: string;
}
const avatarPalette = ['#7C5FF5', '#FFD93D', '#FF4D2D', '#00A76B'];
export const Avatar = ({ name = '?', size = 36, className }: AvatarProps) => {
  const idx = (name.charCodeAt(0) || 0) % avatarPalette.length;
  const bg = avatarPalette[idx];
  const initial = name[0]?.toUpperCase() || '?';
  const fg = idx === 1 ? '#0A0A0A' : '#ffffff';
  return (
    <div
      className={cn('rounded-full border-2 border-ink flex-shrink-0 grid place-items-center font-sans font-bold', className)}
      style={{
        width: size,
        height: size,
        background: bg,
        color: fg,
        fontSize: size * 0.4,
      }}
    >
      {initial}
    </div>
  );
};

// -------- Arrow: used both inline and in buttons. ----------------------------
export interface ArrowProps {
  dir?: 'right' | 'up' | 'down' | 'left';
  size?: number;
  className?: string;
}
export const Arrow = ({ dir = 'right', size = 16, className }: ArrowProps) => {
  const rot = { right: 0, up: -90, down: 90, left: 180 }[dir];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: `rotate(${rot}deg)` }}
      className={className}
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
};

// -------- Check / Cross tiny icons (brutalist line-art). --------------------
export const Check = ({ size = 14, className }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="4 11 8 15 16 5" />
  </svg>
);
export const Cross = ({ size = 14, className }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className={className}>
    <line x1="5" y1="5" x2="15" y2="15" />
    <line x1="15" y1="5" x2="5" y2="15" />
  </svg>
);

// -------- Mono code chip (inline highlight). --------------------------------
export const Mono = ({ children, className }: { children: ReactNode; className?: string }) => (
  <code
    className={cn(
      'font-mono text-[0.85em] bg-pop border-2 border-ink px-[7px] py-[1px]',
      className,
    )}
  >
    {children}
  </code>
);
