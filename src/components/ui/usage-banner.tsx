import { Link } from 'react-router-dom';
import { AlertTriangle, Gauge, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCurrentUsage, getLimit, getRemainingUsage, isOverLimit } from '@/lib/usage';
import type { Profile } from '@/lib/db';

interface UsageBannerProps {
  profile: Profile | null;
}

export function UsageBanner({ profile }: UsageBannerProps) {
  if (!profile) return null;

  const limit = getLimit(profile.plan);
  if (limit === null) return null;

  const used = getCurrentUsage(profile);
  const remaining = getRemainingUsage(profile) ?? 0;
  const blocked = isOverLimit(profile);
  const warning = !blocked && used / limit >= 0.8;
  const percent = Math.min((used / limit) * 100, 100);
  const resetLabel = new Date(profile.usage_reset_at).toLocaleDateString('tr-TR');

  const tone = blocked
    ? 'border-destructive bg-destructive-tint'
    : warning
      ? 'border-ink bg-pop'
      : 'border-ink bg-primary-tint';

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-4 border-2 p-4 shadow-brutal-sm ${tone}`}
      role={blocked ? 'alert' : 'status'}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center border-2 border-ink bg-paper">
          {blocked ? <Lock className="h-5 w-5" /> : warning ? <AlertTriangle className="h-5 w-5" /> : <Gauge className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[22px] leading-tight">
            {blocked ? 'Analiz hakkın doldu.' : `${remaining} analiz hakkın kaldı.`}
          </div>
          <div className="mt-1 text-sm text-ink-muted">
            Bu döngü {used}/{limit} analiz kullandın. Yenilenme: {resetLabel}.
          </div>
          <div className="mt-3 h-2 w-full max-w-md border-2 border-ink bg-paper">
            <div
              className={`h-full ${blocked ? 'bg-destructive' : warning ? 'bg-ink' : 'bg-primary'}`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>
      <Link to="/app/billing" className="shrink-0">
        <Button
          variant={blocked ? 'danger' : 'ink'}
          onClick={() => {
            import('@/lib/analytics')
              .then(({ trackUpgradeClicked }) => trackUpgradeClicked('pro', 'limit_banner'))
              .catch(() => {});
          }}
        >
          Pro'ya geç
        </Button>
      </Link>
    </div>
  );
}
