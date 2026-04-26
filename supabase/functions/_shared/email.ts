// Shared Resend e-posta yardımcısı
// Env: RESEND_API_KEY, APP_URL (e.g. https://netoku.app)

declare const Deno: { env: { get(k: string): string | undefined } };

const RESEND_API = 'https://api.resend.com/emails';
const FROM_ADDRESS = 'NetOku <noreply@netoku.app>';
const APP_URL = Deno.env.get('APP_URL') ?? 'https://netoku.app';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) {
    console.warn('[email] RESEND_API_KEY not set — skipping email');
    return;
  }
  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_ADDRESS, to: payload.to, subject: payload.subject, html: payload.html }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error('[email] Resend error:', res.status, text);
  }
}

// ── Template: Hoşgeldin ────────────────────────────────────────────────────────

export function welcomeEmail(to: string): EmailPayload {
  return {
    to,
    subject: 'NetOku\'ya Hoş Geldiniz!',
    html: `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden">
        <tr><td style="background:#2563eb;padding:28px 32px">
          <span style="font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.5px">N NetOku</span>
        </td></tr>
        <tr><td style="padding:32px">
          <h1 style="margin:0 0 8px;font-size:24px;font-weight:600">Hoş Geldiniz!</h1>
          <p style="margin:0 0 20px;color:#6b7280;line-height:1.6">
            NetOku'ya kayıt olduğunuz için teşekkürler. Optik okuyucudan çıkan ham verileri saniyeler içinde analize dönüştürmeye hazırsınız.
          </p>
          <p style="margin:0 0 8px;color:#374151;font-weight:500">Free planınızda:</p>
          <ul style="margin:0 0 24px;padding-left:20px;color:#6b7280;line-height:1.8">
            <li>Ayda 2 analiz</li>
            <li>En fazla 3 ders</li>
            <li>Tüm Excel sayfaları</li>
          </ul>
          <a href="${APP_URL}/app/analyze"
             style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px">
            İlk Analizimi Yap →
          </a>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #f3f4f6;color:#9ca3af;font-size:13px">
          Bu e-postayı almak istemiyorsanız <a href="${APP_URL}/app" style="color:#6b7280">hesabınızı</a> ziyaret edin.
          <br>${APP_URL}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

// ── Template: Abonelik Onaylandı ──────────────────────────────────────────────

export function subscriptionConfirmedEmail(to: string, plan: string): EmailPayload {
  const planLabel = plan === 'school' ? 'School' : 'Pro';
  const features =
    plan === 'school'
      ? ['Sınırsız analiz', 'En fazla 5 ders', '5 kullanıcı ekip', 'Ortak preset ve arşiv', 'OBS not aktarma']
      : ['Sınırsız analiz', 'En fazla 5 ders', 'Preset ve geçmiş kayıt', 'OBS not aktarma', 'Öncelikli destek'];

  return {
    to,
    subject: `NetOku ${planLabel} aktif — Hoş geldiniz!`,
    html: `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden">
        <tr><td style="background:#16a34a;padding:28px 32px">
          <span style="font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.5px">N NetOku ${planLabel}</span>
        </td></tr>
        <tr><td style="padding:32px">
          <h1 style="margin:0 0 8px;font-size:24px;font-weight:600">${planLabel} planınız aktif! 🎉</h1>
          <p style="margin:0 0 20px;color:#6b7280;line-height:1.6">
            Ödemeniz başarıyla alındı. Artık ${planLabel} plan avantajlarından yararlanabilirsiniz.
          </p>
          <p style="margin:0 0 8px;color:#374151;font-weight:500">${planLabel} planınızda:</p>
          <ul style="margin:0 0 24px;padding-left:20px;color:#6b7280;line-height:1.8">
            ${features.map((f) => `<li>${f}</li>`).join('')}
          </ul>
          <a href="${APP_URL}/app/analyze"
             style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px">
            Analiz Yap →
          </a>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #f3f4f6;color:#9ca3af;font-size:13px">
          Aboneliğinizi yönetmek için <a href="${APP_URL}/app/billing" style="color:#6b7280">Fatura sayfanızı</a> ziyaret edin.
          <br>${APP_URL}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

// ── Template: Abonelik İptal ──────────────────────────────────────────────────

export function subscriptionCancelledEmail(to: string): EmailPayload {
  return {
    to,
    subject: 'NetOku aboneliğiniz iptal edildi',
    html: `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden">
        <tr><td style="background:#6b7280;padding:28px 32px">
          <span style="font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.5px">N NetOku</span>
        </td></tr>
        <tr><td style="padding:32px">
          <h1 style="margin:0 0 8px;font-size:24px;font-weight:600">Aboneliğiniz iptal edildi</h1>
          <p style="margin:0 0 20px;color:#6b7280;line-height:1.6">
            Aboneliğiniz başarıyla iptal edildi. Hesabınız Free plana geçti, mevcut analizlerinize erişmeye devam edebilirsiniz.
          </p>
          <p style="margin:0 0 20px;color:#6b7280;line-height:1.6">
            Fikirlerinizi öğrenmek isteriz — neden ayrıldığınızı bize iletmek ister misiniz?
          </p>
          <a href="${APP_URL}/pricing"
             style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px">
            Yeniden Abone Ol →
          </a>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #f3f4f6;color:#9ca3af;font-size:13px">
          ${APP_URL}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

// ── Template: Ekip Daveti ─────────────────────────────────────────────────────

export function teamInviteEmail(
  to: string,
  inviterEmail: string,
  orgName: string,
  token: string,
): EmailPayload {
  const acceptUrl = `${APP_URL}/invite/${token}`;
  return {
    to,
    subject: `${inviterEmail} sizi NetOku ekibine davet etti`,
    html: `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden">
        <tr><td style="background:#2563eb;padding:28px 32px">
          <span style="font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.5px">N NetOku School</span>
        </td></tr>
        <tr><td style="padding:32px">
          <h1 style="margin:0 0 8px;font-size:24px;font-weight:600">Ekip davetiniz var</h1>
          <p style="margin:0 0 20px;color:#6b7280;line-height:1.6">
            <strong>${inviterEmail}</strong>, sizi NetOku School aboneliğindeki
            <strong>${orgName}</strong> ekibine davet etti.
          </p>
          <p style="margin:0 0 20px;color:#6b7280;line-height:1.6">
            Daveti kabul edersek School plan avantajlarının tümünden yararlanabilirsiniz:
            sınırsız analiz, 5 dersli değerlendirme, ortak preset arşivi ve OBS not aktarma.
          </p>
          <a href="${acceptUrl}"
             style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px">
            Daveti Kabul Et →
          </a>
          <p style="margin:24px 0 0;color:#9ca3af;font-size:13px;line-height:1.6">
            Bağlantı çalışmazsa: <a href="${acceptUrl}" style="color:#2563eb">${acceptUrl}</a><br>
            Bu davet 7 gün içinde sona erer.
          </p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #f3f4f6;color:#9ca3af;font-size:13px">
          Bu daveti beklemiyorsanız, bu e-postayı yok sayabilirsiniz.
          <br>${APP_URL}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

// ── Template: Kullanım Limiti Uyarısı ─────────────────────────────────────────

export function usageLimitWarningEmail(to: string, used: number, limit: number): EmailPayload {
  const pct = Math.round((used / limit) * 100);
  const remaining = limit - used;
  return {
    to,
    subject: `NetOku: Aylık limitinizin %${pct}'i kullanıldı`,
    html: `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden">
        <tr><td style="background:#d97706;padding:28px 32px">
          <span style="font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.5px">N NetOku</span>
        </td></tr>
        <tr><td style="padding:32px">
          <h1 style="margin:0 0 8px;font-size:24px;font-weight:600">Aylık limitiniz dolmak üzere</h1>
          <p style="margin:0 0 20px;color:#6b7280;line-height:1.6">
            Bu ay <strong>${used}/${limit}</strong> analiz kullandınız (%${pct}).
            Yalnızca <strong>${remaining} analiz hakkınız</strong> kaldı.
          </p>
          <p style="margin:0 0 20px;color:#6b7280;line-height:1.6">
            Limit dolduğunda analiz yapamayacaksınız. Pro planına geçerek sınırsız analiz yapabilirsiniz.
          </p>
          <a href="${APP_URL}/pricing"
             style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px">
            Pro'ya Geç — $19/ay →
          </a>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #f3f4f6;color:#9ca3af;font-size:13px">
          Bu bildirimi almak istemiyorsanız <a href="${APP_URL}/app" style="color:#6b7280">buradan</a> ayarlayabilirsiniz.
          <br>${APP_URL}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}
