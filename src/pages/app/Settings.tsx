import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Copy,
  Download,
  Loader2,
  MailPlus,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Chip, Eyebrow, Tag } from '@/components/ui/brutal';
import { useAuth } from '@/lib/auth';
import { supabase, supabaseReady } from '@/lib/supabase';
import { fetchProfile, type OrgRole, type Profile } from '@/lib/db';
import {
  deleteAccount,
  exportData,
  getReferralCode,
  getReferralCount,
  saveTaxInfo,
  type TaxInfo,
} from '@/lib/account';
import { downloadDataExportZip } from '@/lib/data-export';
import {
  cancelInvite,
  getTeamInfo,
  inviteMember,
  removeMember,
  saveOrganizationBranding,
  type TeamInfo,
  updateMemberRole,
} from '@/lib/team';
import { track } from '@/lib/analytics';
import { errorMessage, messages } from '@/lib/messages';

const passwordSchema = z
  .object({
    password: z.string().min(8, 'En az 8 karakter.'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Parolalar eşleşmiyor.',
    path: ['confirm'],
  });

type PasswordData = z.infer<typeof passwordSchema>;

const PLAN_LABEL: Record<Profile['plan'], string> = {
  free: 'Tadımlık',
  pro: 'Pro',
  school: 'Okul',
};

type TabId = 'profile' | 'security' | 'team' | 'data';

export function Settings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>('profile');

  const [savingPassword, setSavingPassword] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const [team, setTeam] = useState<TeamInfo | null>(null);
  const [teamLoading, setTeamLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrgRole>('teacher');
  const [inviting, setInviting] = useState(false);
  const [savingBranding, setSavingBranding] = useState(false);
  const [branding, setBranding] = useState({
    name: '',
    logoUrl: '',
    primaryColor: '#0F172A',
    accentColor: '#F4D35E',
  });

  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralCount, setReferralCount] = useState<number>(0);
  const [referralCopied, setReferralCopied] = useState(false);

  const [taxInfo, setTaxInfo] = useState<TaxInfo>({ tax_id: '', tax_name: '', tax_address: '' });
  const [savingTax, setSavingTax] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordData>({ resolver: zodResolver(passwordSchema) });

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetchProfile(user.id)
      .then((p) => {
        setProfile(p);
        if (p) {
          setTaxInfo({
            tax_id: (p as unknown as Record<string, string>)['tax_id'] ?? '',
            tax_name: (p as unknown as Record<string, string>)['tax_name'] ?? '',
            tax_address: (p as unknown as Record<string, string>)['tax_address'] ?? '',
          });
        }
        if (p?.plan === 'school') {
          setTeamLoading(true);
          getTeamInfo()
            .then((info) => {
              setTeam(info);
              if (info) {
                setBranding({
                  name: info.org.brand_name || info.org.name,
                  logoUrl: info.org.logo_url || '',
                  primaryColor: info.org.brand_primary_color,
                  accentColor: info.org.brand_accent_color,
                });
              }
            })
            .catch(() => null)
            .finally(() => setTeamLoading(false));
        }
      })
      .finally(() => setLoading(false));

    Promise.all([getReferralCode(user.id), getReferralCount(user.id)])
      .then(([code, count]) => {
        setReferralCode(code);
        setReferralCount(count);
      })
      .catch(() => null);
  }, [user]);

  const onPasswordSubmit = async (data: PasswordData) => {
    if (!supabaseReady || !supabase) return;
    const sb = supabase;
    setSavingPassword(true);
    try {
      const { error } = await sb.auth.updateUser({ password: data.password });
      if (error) throw error;
      toast.success('Parolanız güncellendi.');
      reset();
    } catch (e) {
      toast.error(errorMessage(e, messages.settings.passwordUpdateFailed));
    } finally {
      setSavingPassword(false);
    }
  };

  const onExport = async () => {
    setExporting(true);
    try {
      const data = await exportData();
      downloadDataExportZip(data);
      track('data_export_downloaded');
      toast.success('Verileriniz indirildi.');
    } catch (e) {
      toast.error(errorMessage(e, messages.settings.exportFailed));
    } finally {
      setExporting(false);
    }
  };

  const onDelete = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      track('account_deleted');
      toast.success('Hesabınız silindi.');
      await signOut();
      navigate('/', { replace: true });
    } catch (e) {
      toast.error(errorMessage(e, messages.settings.accountDeleteFailed));
      setDeleting(false);
    }
  };

  const onInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await inviteMember(inviteEmail.trim(), inviteRole);
      toast.success(`Davet gönderildi: ${inviteEmail.trim()}`);
      setInviteEmail('');
      setInviteRole('teacher');
      const updated = await getTeamInfo();
      setTeam(updated);
    } catch (e) {
      toast.error(errorMessage(e, messages.settings.inviteFailed));
    } finally {
      setInviting(false);
    }
  };

  const onUpdateMemberRole = async (memberId: string, role: OrgRole) => {
    try {
      await updateMemberRole(memberId, role);
      toast.success('Rol güncellendi.');
      setTeam((prev) =>
        prev
          ? {
              ...prev,
              members: prev.members.map((member) =>
                member.id === memberId ? { ...member, organization_role: role } : member,
              ),
            }
          : prev,
      );
    } catch (e) {
      toast.error(errorMessage(e, messages.settings.roleUpdateFailed));
    }
  };

  const onRemoveMember = async (memberId: string, memberEmail: string) => {
    try {
      await removeMember(memberId);
      toast.success(`${memberEmail} ekipten çıkarıldı.`);
      setTeam((prev) =>
        prev ? { ...prev, members: prev.members.filter((m) => m.id !== memberId) } : prev,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Üye çıkarılamadı.');
    }
  };

  const onCancelInvite = async (inviteId: string, email: string) => {
    try {
      await cancelInvite(inviteId);
      toast.success(`${email} daveti iptal edildi.`);
      setTeam((prev) =>
        prev ? { ...prev, invites: prev.invites.filter((i) => i.id !== inviteId) } : prev,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Davet iptal edilemedi.');
    }
  };

  const onSaveTax = async () => {
    if (!user) return;
    setSavingTax(true);
    try {
      await saveTaxInfo(user.id, taxInfo);
      toast.success('Fatura bilgileri kaydedildi.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Kaydedilemedi.');
    } finally {
      setSavingTax(false);
    }
  };

  const onSaveBranding = async () => {
    if (!team) return;
    setSavingBranding(true);
    try {
      await saveOrganizationBranding({
        organizationId: team.org.id,
        name: branding.name,
        logoUrl: branding.logoUrl || null,
        primaryColor: branding.primaryColor,
        accentColor: branding.accentColor,
      });
      toast.success('Kurum markalama ayarları kaydedildi.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Markalama kaydedilemedi.');
    } finally {
      setSavingBranding(false);
    }
  };

  const copyReferralLink = () => {
    if (!referralCode) return;
    const link = `${window.location.origin}/auth?mode=signup&ref=${referralCode}`;
    navigator.clipboard.writeText(link).then(() => {
      setReferralCopied(true);
      setTimeout(() => setReferralCopied(false), 2000);
    });
  };

  const provider = user?.app_metadata?.provider;
  const isOAuthUser = Boolean(provider && provider !== 'email');
  const canManageTeam = team?.currentRole === 'owner' || team?.currentRole === 'manager';

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: 'profile', label: 'Profil' },
    { id: 'security', label: 'Güvenlik' },
    { id: 'team', label: 'Ekip' },
    { id: 'data', label: 'Veri' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <Eyebrow>— Hesap</Eyebrow>
        <h1 className="mt-3 font-display text-[clamp(40px,5vw,56px)] leading-[1.02] tracking-[-0.02em]">
          Ayarlar.
        </h1>
      </div>

      {!supabaseReady && (
        <Card className="border-destructive bg-destructive-tint p-4 text-sm text-ink">
          Supabase yapılandırılmamış. Ayarlar görüntülenemiyor.
        </Card>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-0 border-b-2 border-ink">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`border-2 border-b-0 border-ink px-5 py-2.5 font-sans text-sm font-bold transition-colors ${
              tab === t.id
                ? 'bg-ink text-white'
                : 'bg-paper text-ink hover:bg-ink/5'
            }`}
            style={{ marginBottom: '-2px' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: profile */}
      {tab === 'profile' && (
        <div className="space-y-5">
          <Card className="p-6">
            <Eyebrow>— Profil</Eyebrow>
            <h2 className="mt-2 font-display text-[28px] leading-tight">Hesap bilgileri</h2>
            <div className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <Label>E-posta</Label>
                <Input value={user?.email ?? ''} disabled readOnly />
                <p className="text-xs text-ink-muted">Giriş bilgisi olarak kullanılır.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Plan</Label>
                {loading ? (
                  <div className="h-9 w-24 animate-pulse border-2 border-ink bg-paper" />
                ) : (
                  <div className="inline-flex items-center gap-2">
                    <Tag color="pop" textColor="ink">
                      {PLAN_LABEL[profile?.plan ?? 'free']}
                    </Tag>
                    {profile?.plan === 'free' && (
                      <button
                        onClick={() => navigate('/app/billing')}
                        className="text-xs font-bold text-primary underline underline-offset-2"
                      >
                        Yükselt →
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Giriş yöntemi</Label>
                <p className="text-sm text-ink-muted">
                  {isOAuthUser
                    ? `${provider!.charAt(0).toUpperCase() + provider!.slice(1)} ile giriş`
                    : 'E-posta ve parola'}
                </p>
              </div>
            </div>
          </Card>

          {/* Tax info */}
          <Card className="p-6">
            <Eyebrow>— Fatura</Eyebrow>
            <h2 className="mt-2 font-display text-[28px] leading-tight">Fatura bilgileri</h2>
            <p className="mt-1 text-sm text-ink-muted">
              VKN/TCKN. Ödemede iletilir.
            </p>
            <div className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="tax-id">VKN / TCKN</Label>
                  <Input
                    id="tax-id"
                    placeholder="1234567890"
                    value={taxInfo.tax_id}
                    onChange={(e) =>
                      setTaxInfo((prev) => ({ ...prev, tax_id: e.target.value }))
                    }
                    maxLength={11}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tax-name">Fatura Adı / Ünvan</Label>
                  <Input
                    id="tax-name"
                    placeholder="Ahmet Yılmaz"
                    value={taxInfo.tax_name}
                    onChange={(e) =>
                      setTaxInfo((prev) => ({ ...prev, tax_name: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tax-address">Fatura Adresi</Label>
                <Input
                  id="tax-address"
                  placeholder="Atatürk Cad. No:1"
                  value={taxInfo.tax_address}
                  onChange={(e) =>
                    setTaxInfo((prev) => ({ ...prev, tax_address: e.target.value }))
                  }
                />
              </div>
              <Button
                variant="ink"
                onClick={onSaveTax}
                disabled={savingTax}
                className="gap-2"
              >
                {savingTax && <Loader2 className="h-4 w-4 animate-spin" />}
                Kaydet
              </Button>
            </div>
          </Card>

          {/* Referral */}
          {referralCode && (
            <Card className="bg-pop p-6">
              <Eyebrow>— Davet et</Eyebrow>
              <h2 className="mt-2 font-display text-[28px] leading-tight">
                Arkadaşını getir
              </h2>
              <p className="mt-1 text-sm text-ink/80">
                Şu ana kadar <strong>{referralCount}</strong> kişi bağlantınla kayıt oldu.
              </p>
              <div className="mt-4 flex items-center gap-2 border-2 border-ink bg-paper px-3 py-2 font-mono text-sm">
                <span className="flex-1 truncate text-ink-muted">
                  {`${window.location.origin}/auth?mode=signup&ref=${referralCode}`}
                </span>
                <Button
                  variant="ink"
                  size="sm"
                  className="shrink-0 gap-1.5"
                  onClick={copyReferralLink}
                >
                  {referralCopied ? (
                    <span className="text-xs">Kopyalandı!</span>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span className="text-xs">Kopyala</span>
                    </>
                  )}
                </Button>
              </div>
              {profile?.plan === 'school' && team && (
                <div className="mt-6 space-y-4 border-t-2 border-ink pt-5">
                <div>
                  <p className="text-sm font-bold">Kurum markalama</p>
                  <p className="text-xs text-ink-muted">
                    Paylaşılabilir veli raporları ve PDF çıktıları bu bilgilerle markalanır.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="brand-name">Marka Adı</Label>
                    <Input
                      id="brand-name"
                      value={branding.name}
                      onChange={(e) => setBranding((prev) => ({ ...prev, name: e.target.value }))}
                      disabled={!canManageTeam}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="brand-logo">Logo URL</Label>
                    <Input
                      id="brand-logo"
                      value={branding.logoUrl}
                      onChange={(e) => setBranding((prev) => ({ ...prev, logoUrl: e.target.value }))}
                      disabled={!canManageTeam}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="brand-primary">Birincil Renk</Label>
                    <Input
                      id="brand-primary"
                      value={branding.primaryColor}
                      onChange={(e) => setBranding((prev) => ({ ...prev, primaryColor: e.target.value }))}
                      disabled={!canManageTeam}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="brand-accent">Vurgu Rengi</Label>
                    <Input
                      id="brand-accent"
                      value={branding.accentColor}
                      onChange={(e) => setBranding((prev) => ({ ...prev, accentColor: e.target.value }))}
                      disabled={!canManageTeam}
                    />
                  </div>
                </div>
                  {canManageTeam && (
                    <Button variant="ink" onClick={onSaveBranding} disabled={savingBranding}>
                      {savingBranding ? 'Kaydediliyor…' : 'Markayı Kaydet'}
                    </Button>
                  )}
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* Tab: security */}
      {tab === 'security' && (
        <div className="space-y-5">
          {isOAuthUser ? (
            <Card className="p-6">
              <Eyebrow>— Güvenlik</Eyebrow>
              <h2 className="mt-2 font-display text-[28px] leading-tight">
                {provider?.charAt(0).toUpperCase()}{provider?.slice(1)} ile giriş
              </h2>
              <p className="mt-2 text-sm text-ink-muted">
                Parola yönetimi {provider} üzerinden yapılır.
              </p>
            </Card>
          ) : (
            <Card className="p-6">
              <Eyebrow>— Güvenlik</Eyebrow>
              <h2 className="mt-2 font-display text-[28px] leading-tight">Parola değiştir</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Düzenli olarak güncelle.
              </p>
              <form
                onSubmit={handleSubmit(onPasswordSubmit)}
                className="mt-5 max-w-sm space-y-4"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="new-password">Yeni Parola</Label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    {...register('password')}
                  />
                  {errors.password && (
                    <p className="text-xs text-destructive">{errors.password.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password">Parola Tekrar</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    {...register('confirm')}
                  />
                  {errors.confirm && (
                    <p className="text-xs text-destructive">{errors.confirm.message}</p>
                  )}
                </div>
                <Button
                  variant="ink"
                  type="submit"
                  className="gap-2"
                  disabled={savingPassword}
                >
                  {savingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
                  Parolayı Güncelle
                </Button>
              </form>
            </Card>
          )}
        </div>
      )}

      {/* Tab: team */}
      {tab === 'team' && (
        <div className="space-y-5">
          {profile?.plan !== 'school' ? (
            <Card className="border-dashed p-10 text-center">
              <Eyebrow>— Ekip</Eyebrow>
              <h2 className="mt-3 font-display text-[28px] leading-tight">
                Okul planı gerekli
              </h2>
              <p className="mt-2 text-sm text-ink-muted">
                Ekip yönetimi sadece Okul planında kullanılabilir.
              </p>
              <Button
                variant="primary"
                size="sm"
                className="mt-4"
                onClick={() => navigate('/app/billing')}
              >
                Okul planına geç →
              </Button>
            </Card>
          ) : teamLoading ? (
            <div className="h-40 animate-pulse border-2 border-ink bg-paper shadow-brutal-sm" />
          ) : team ? (
            <Card className="p-6">
              <Eyebrow>— Ekip</Eyebrow>
              <h2 className="mt-2 font-display text-[28px] leading-tight">
                {team.org.name}
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                {team.members.length}/{team.org.seat_limit} koltuk kullanılıyor
              </p>

              {team.members.length > 0 && (
                <div className="mt-5 space-y-2">
                  <p className="text-sm font-bold">Aktif Üyeler</p>
                  {team.members.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between border-2 border-ink bg-cream px-3 py-2 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span>{m.email}</span>
                        <Tag color="paper" textColor="ink">
                          {m.organization_role}
                        </Tag>
                      </div>
                      {canManageTeam && m.id !== user?.id && (
                        <select
                          className="border-2 border-ink bg-paper px-2 py-1 text-xs font-bold"
                          value={m.organization_role}
                          onChange={(e) => onUpdateMemberRole(m.id, e.target.value as OrgRole)}
                        >
                          <option value="manager">manager</option>
                          <option value="teacher">teacher</option>
                          <option value="viewer">viewer</option>
                        </select>
                      )}
                      {canManageTeam && m.id !== user?.id && (
                        <button
                          onClick={() => onRemoveMember(m.id, m.email)}
                          className="p-1 text-ink-muted hover:text-destructive"
                          aria-label={`${m.email} üyeyi çıkar`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {team.invites.filter((i) => !i.accepted_at).length > 0 && (
                <div className="mt-5 space-y-2">
                  <p className="text-sm font-bold text-ink-muted">Bekleyen Davetler</p>
                  {team.invites
                    .filter((i) => !i.accepted_at)
                    .map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between border-2 border-dashed border-ink px-3 py-2 text-sm"
                      >
                        <span className="text-ink-muted">{inv.email}</span>
                        <button
                          onClick={() => onCancelInvite(inv.id, inv.email)}
                          className="p-1 text-ink-muted hover:text-destructive"
                          aria-label={`${inv.email} davetini iptal et`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                </div>
              )}

              {canManageTeam && team.members.length < team.org.seat_limit ? (
                <div className="mt-5 space-y-2">
                  <p className="text-sm font-bold">Yeni Üye Davet Et</p>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="ornek@okul.k12.tr"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && onInvite()}
                      className="flex-1"
                    />
                    <select
                      className="border-2 border-ink bg-paper px-3 py-2 text-sm font-bold"
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as OrgRole)}
                    >
                      <option value="manager">manager</option>
                      <option value="teacher">teacher</option>
                      <option value="viewer">viewer</option>
                    </select>
                    <Button
                      variant="ink"
                      onClick={onInvite}
                      disabled={inviting || !inviteEmail.trim()}
                      className="shrink-0 gap-1.5"
                    >
                      {inviting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MailPlus className="h-4 w-4" />
                      )}
                      Davet Et
                    </Button>
                  </div>
                  <p className="text-xs text-ink-muted">
                    Bağlantı 7 gün geçerlidir.
                  </p>
                </div>
              ) : (
                <p className="mt-5 text-sm text-ink-muted">
                  Ekip limitine ulaştın ({team.org.seat_limit} kullanıcı).
                </p>
              )}
            </Card>
          ) : null}
        </div>
      )}

      {/* Tab: data */}
      {tab === 'data' && (
        <div className="space-y-5">
          <Card className="p-6">
            <Eyebrow>— Veri</Eyebrow>
            <h2 className="mt-2 font-display text-[28px] leading-tight">
              Verilerini dışa aktar
            </h2>
            <p className="mt-1 max-w-md text-sm text-ink-muted">
              KVKK/GDPR kapsamında profil, analizler ve preset'lerini ZIP içinde JSON dosyaları
              olarak indir.
            </p>
            <Button
              variant="paper"
              className="mt-5 gap-2"
              onClick={onExport}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Verilerimi İndir (ZIP)
            </Button>
          </Card>

          {/* Danger zone */}
          <Card className="border-destructive bg-destructive-tint p-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <Eyebrow color="ink">— Tehlikeli bölge</Eyebrow>
            </div>
            <h2 className="mt-2 font-display text-[28px] leading-tight">
              Hesabı sil
            </h2>
            <p className="mt-1 max-w-md text-sm text-ink-muted">
              Tüm analizler, preset'ler ve profil kalıcı silinir. Aboneliğin varsa önce iptal et.
            </p>
            <Button
              variant="destructive"
              className="mt-5 gap-2"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4" /> Hesabı Sil
            </Button>
          </Card>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setDeleteConfirm('');
        }}
      >
        <DialogContent className="border-2 border-ink bg-paper shadow-brutal-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-[24px] text-destructive">
              <AlertTriangle className="h-5 w-5" /> Hesabı Sil
            </DialogTitle>
            <DialogDescription className="text-ink-muted">
              Bu işlem geri alınamaz.
              {profile?.plan !== 'free' && (
                <span className="mt-2 block font-bold text-destructive">
                  Aktif bir aboneliğin var. Önce Fatura'dan iptal et.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-confirm">
              Onaylamak için{' '}
              <code className="font-mono text-destructive">SIL</code> yaz:
            </Label>
            <Input
              id="delete-confirm"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="SIL"
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Vazgeç
            </Button>
            <Button
              variant="destructive"
              className="gap-2"
              onClick={onDelete}
              disabled={deleteConfirm !== 'SIL' || deleting || profile?.plan !== 'free'}
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Kalıcı Olarak Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chip import reserved for potential future filters. */}
      <div style={{ display: 'none' }}><Chip>.</Chip></div>
    </div>
  );
}
