/**
 * User-facing strings consolidated here for future i18n.
 *
 * Convention: nest by feature area, keep keys short and descriptive.
 * When swapping to an i18n library later, each leaf becomes a translation key.
 *
 * Usage: `toast.error(errorMessage(e, messages.auth.genericError))`
 */

export const messages = {
  common: {
    genericError: 'Bir hata oluştu.',
    unknownError: 'Bilinmeyen bir hata oluştu.',
    loading: 'Yükleniyor…',
    tryAgain: 'Tekrar deneyin.',
    saved: 'Kaydedildi.',
    copied: 'Kopyalandı.',
    deleted: 'Silindi.',
  },

  auth: {
    genericError: 'Bir hata oluştu.',
    googleSignInFailed: 'Google ile giriş başarısız.',
    emailSent: 'Giriş bağlantısı e-postanıza gönderildi.',
    signedOut: 'Çıkış yapıldı.',
    rateLimited: (seconds: number) =>
      `Çok fazla deneme. Lütfen ${seconds} saniye bekleyin.`,
    accountLocked: 'Hesap geçici olarak kilitlendi. Lütfen daha sonra tekrar deneyin.',
  },

  analysis: {
    failed: 'Analiz başarısız.',
    keyMissing: 'Manuel cevap anahtarı eksik.',
    obsExportFailed: 'OBS dışa aktarma başarısız.',
    excelExportFailed: 'Excel dışa aktarma başarısız.',
    fileUnreadable: 'Dosya okunamadı. Lütfen .txt formatında optik okuyucu çıktısı yükleyin.',
    emptyFile: 'Dosya boş görünüyor.',
  },

  history: {
    loadFailed: 'Geçmiş yüklenemedi.',
    deleteFailed: 'Analiz silinemedi.',
    deleted: 'Analiz silindi.',
  },

  insights: {
    loadFailed: 'İçgörüler yüklenemedi.',
    shareLinkFailed: 'Paylaşım linki oluşturulamadı.',
    shareLinkCreated: 'Paylaşım linki oluşturuldu.',
  },

  settings: {
    passwordUpdateFailed: 'Parola güncellenemedi.',
    passwordUpdated: 'Parola güncellendi.',
    exportFailed: 'Dışa aktarma başarısız.',
    exportDataUnavailable: 'Dışa aktarma verisi alınamadı.',
    accountDeleteFailed: 'Hesap silinemedi.',
    accountDeleted: 'Hesap silindi.',
    inviteFailed: 'Davet gönderilemedi.',
    inviteSent: 'Davet gönderildi.',
    roleUpdateFailed: 'Rol güncellenemedi.',
    roleUpdated: 'Rol güncellendi.',
    emailSendFailed: 'E-posta gönderilemedi.',
  },

  billing: {
    alreadySubscribed:
      'Zaten aktif bir aboneliğiniz var. Planınızı yönetmek için Faturalama sayfasını kullanın.',
    checkoutUrlMissing: 'Checkout URL alınamadı.',
    portalUrlMissing: 'Portal URL alınamadı.',
    checkoutFailed: 'Ödeme başlatılamadı.',
    portalFailed: 'Portal açılamadı.',
    rateLimited: (seconds: number) =>
      `Çok fazla deneme. Lütfen ${seconds} saniye bekleyin.`,
  },

  presets: {
    saveFailed: 'Preset kaydedilemedi.',
    loadFailed: 'Preset yüklenemedi.',
    deleteFailed: 'Preset silinemedi.',
    saved: 'Preset kaydedildi.',
    deleted: 'Preset silindi.',
  },

  sharedReport: {
    notFound: 'Rapor bulunamadı veya süresi doldu.',
    loadFailed: 'Rapor yüklenemedi.',
  },

  infrastructure: {
    supabaseNotConfigured:
      'Supabase yapılandırılmamış. .env dosyasında VITE_SUPABASE_URL ve VITE_SUPABASE_PUBLISHABLE_KEY tanımlayın.',
  },

  validation: {
    studentIdInvalid: 'Öğrenci no hatalı',
    nameRequired: 'Ad alanı zorunlu.',
    emailInvalid: 'Geçerli bir e-posta adresi girin.',
    passwordTooShort: 'Parola en az 6 karakter olmalı.',
  },
} as const;

/**
 * Extract a user-facing string from an unknown thrown value, with a typed fallback.
 *
 * Preserves messages from `Error` instances (including those thrown from Supabase
 * edge functions) while ensuring we never leak `[object Object]` to users.
 */
export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.length > 0) return error;
  return fallback;
}
