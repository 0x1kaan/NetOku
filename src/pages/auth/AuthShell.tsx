import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-6 py-10 font-sans text-ink">
      <div className="w-full max-w-[440px]">
        <Link to="/" className="mb-7 inline-flex items-center gap-2.5">
          <div className="grid h-11 w-11 place-items-center border-2 border-ink bg-primary font-display text-[26px] text-white shadow-[3px_3px_0_0_#0A0A0A]">
            N
          </div>
          <span className="font-display text-[32px] leading-none">NetOku</span>
        </Link>

        <Card className="p-8">
          <h1 className="mb-1.5 font-display text-[36px] leading-[1.05] tracking-[-0.02em]">
            {title}
          </h1>
          <p className="mb-6 text-sm text-ink-muted">{subtitle}</p>
          {children}
        </Card>
      </div>
    </div>
  );
}
