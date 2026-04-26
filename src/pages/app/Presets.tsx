import { useEffect, useMemo, useState } from 'react';
import { Plus, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Eyebrow, Tag } from '@/components/ui/brutal';
import { useAuth } from '@/lib/auth';
import {
  deletePreset,
  fetchProfile,
  listWorkspacePresets,
  type PresetRecord,
  type Profile,
} from '@/lib/db';
import { errorMessage, messages } from '@/lib/messages';
import { supabaseReady } from '@/lib/supabase';
import { PRESET_CONFIGS, getPresetAnalyzePath, type PresetId } from '@/presets';
import { useAnalyzeStore } from '@/store/analyzeStore';

const CARD_BG = ['bg-pop', 'bg-primary-tint', 'bg-destructive-tint', 'bg-success-tint'];

export function Presets() {
  const { user } = useAuth();
  const { applyPreset, clearPreset, setSettings } = useAnalyzeStore();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<PresetRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const fetchedProfile = await fetchProfile(user.id);
      setProfile(fetchedProfile);
      setItems(
        await listWorkspacePresets({
          userId: user.id,
          organizationId: fetchedProfile?.organization_id,
        }),
      );
    } catch (e) {
      toast.error(errorMessage(e, messages.presets.loadFailed));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const useSavedPreset = (preset: PresetRecord) => {
    setSettings(preset.settings);
    toast.success(`"${preset.name}" yuklendi.`);
    navigate('/app/analyze');
  };

  const handleBuiltinPreset = (templateId: PresetId) => {
    const template = PRESET_CONFIGS.find((item) => item.id === templateId);
    if (!template) return;
    applyPreset(template.id);
    toast.success(`"${template.title}" sablonu yuklendi.`);
    navigate(getPresetAnalyzePath(template.id));
  };

  const remove = async (id: string) => {
    try {
      await deletePreset(id);
      setItems((xs) => xs.filter((x) => x.id !== id));
    } catch (e) {
      toast.error(errorMessage(e, messages.presets.deleteFailed));
    }
  };

  const personalPresets = useMemo(
    () => items.filter((item) => item.scope !== 'organization'),
    [items],
  );
  const organizationPresets = useMemo(
    () => items.filter((item) => item.scope === 'organization'),
    [items],
  );

  return (
    <div className="space-y-8">
      <div>
        <Eyebrow>- Sablonlar</Eyebrow>
        <h1 className="mt-3 font-display text-[clamp(40px,5vw,56px)] leading-[1.02] tracking-[-0.02em]">
          Preset'ler.
        </h1>
        <p className="mt-2 max-w-[680px] text-[15px] text-ink-muted">
          Hazir galeri, kisisel sablonlar ve kurum presetleri ayni kutuphanede.
          Ilk analizde daha hizli deger gormek icin hazir presetlerden baslayabilirsin.
        </p>
      </div>

      {!supabaseReady && (
        <Card className="border-destructive bg-destructive-tint p-4 text-sm text-ink">
          Supabase yapilandirilmamis. Preset'ler kaydedilemiyor.
        </Card>
      )}

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <Eyebrow>- Hazir kutuphane</Eyebrow>
            <h2 className="mt-2 font-display text-[28px] leading-tight">Tek tikla basla</h2>
          </div>
          <Tag color="paper" textColor="ink">
            {PRESET_CONFIGS.length} sablon
          </Tag>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {PRESET_CONFIGS.map((template, index) => (
            <Card key={template.id} className={`p-6 ${CARD_BG[index % CARD_BG.length]}`}>
              <Eyebrow>- {template.group}</Eyebrow>
              <div className="mt-3 font-display text-[28px] leading-tight">{template.title}</div>
              <p className="mt-2 text-sm text-ink/80">{template.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {template.tags.map((tag) => (
                  <Tag key={`${template.id}-${tag}`} color="paper" textColor="ink">
                    {tag}
                  </Tag>
                ))}
              </div>
              <div className="mt-6 flex items-center gap-2">
                <Button variant="ink" size="sm" onClick={() => handleBuiltinPreset(template.id)}>
                  Kullan -&gt;
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {loading ? (
        <div className="grid gap-5 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[180px] animate-pulse border-2 border-ink bg-paper shadow-brutal-sm"
            />
          ))}
        </div>
      ) : (
        <>
          {profile?.plan === 'school' && organizationPresets.length > 0 && (
            <PresetSection
              title="Kurum presetleri"
              eyebrow="Ortak"
              items={organizationPresets}
              currentUserId={user?.id}
              onUse={useSavedPreset}
              onRemove={remove}
            />
          )}

          <PresetSection
            title="Senin presetlerin"
            eyebrow="Kisisel"
            items={personalPresets}
            currentUserId={user?.id}
            onUse={useSavedPreset}
            onRemove={remove}
          />

          <button
            type="button"
            onClick={() => {
              clearPreset();
              navigate('/app/analyze');
            }}
            className="flex min-h-[180px] w-full flex-col items-center justify-center gap-2 border-2 border-dashed border-ink bg-transparent p-6 text-ink transition-colors hover:bg-ink/5"
          >
            <Plus className="h-6 w-6" />
            <div className="font-display text-[22px] leading-tight">Yeni preset</div>
            <div className="text-xs text-ink-muted">Analiz sonucundan kaydet</div>
          </button>
        </>
      )}
    </div>
  );
}

function PresetSection({
  title,
  eyebrow,
  items,
  currentUserId,
  onUse,
  onRemove,
}: {
  title: string;
  eyebrow: string;
  items: PresetRecord[];
  currentUserId?: string;
  onUse: (preset: PresetRecord) => void;
  onRemove: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <Card className="border-dashed p-8 text-center">
        <p className="text-sm text-ink-muted">{title} icin henuz kayit yok.</p>
      </Card>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <Eyebrow>- {eyebrow}</Eyebrow>
        <h2 className="mt-2 font-display text-[28px] leading-tight">{title}</h2>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {items.map((preset, index) => (
          <Card key={preset.id} className={`group relative p-6 ${CARD_BG[index % CARD_BG.length]}`}>
            {preset.is_default && (
              <Star className="absolute right-4 top-4 h-4 w-4 fill-ink text-ink" />
            )}
            <Eyebrow>- Preset</Eyebrow>
            <div className="mt-3 font-display text-[32px] leading-tight">{preset.name}</div>
            {preset.description && (
              <p className="mt-2 text-sm text-ink/80">{preset.description}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Tag color="paper" textColor="ink">
                {preset.scope === 'organization' ? 'Kurum' : 'Kisisel'}
              </Tag>
              <Tag color="paper" textColor="ink">
                {preset.settings.courses.length} ders
              </Tag>
              <Tag color="paper" textColor="ink">
                {preset.settings.courses.reduce((sum, course) => sum + course.questionCount, 0)} soru
              </Tag>
            </div>
            <div className="mt-6 flex items-center gap-2">
              <Button variant="ink" size="sm" onClick={() => onUse(preset)}>
                Kullan -&gt;
              </Button>
              {preset.user_id === currentUserId && (
                <button
                  type="button"
                  onClick={() => onRemove(preset.id)}
                  className="border-2 border-ink bg-paper p-2 shadow-brutal-xs hover:-translate-x-px hover:-translate-y-px hover:shadow-brutal-sm"
                  aria-label="Sil"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
