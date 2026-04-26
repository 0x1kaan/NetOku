import { LegalLayout } from './LegalLayout';

export function Refund() {
  return (
    <LegalLayout title="İade ve İptal Politikası" updated="14 Nisan 2026">
      <p>
        Polar.sh, NetOku abonelikleri için merchant of record olarak hareket eder; KDV/VAT tahsilatı Polar
        tarafından gerçekleştirilir.
      </p>

      <h2>1. İptal</h2>
      <ul>
        <li>Aboneliğinizi dilediğiniz zaman <strong>Fatura → Aboneliği Yönet</strong> ekranından iptal edebilirsiniz.</li>
        <li>İptal, mevcut fatura döneminin sonunda geçerli olur; kalan süre boyunca hizmete erişiminiz devam eder.</li>
        <li>İptal sonrası hesabınız Free plana düşer; verileriniz silinmez.</li>
      </ul>

      <h2>2. İade</h2>
      <ul>
        <li>
          <strong>14 günlük cayma hakkı:</strong> AB/UK tüketicileri, dijital hizmetlerin sunumuna başlanmadan önce
          14 gün içinde gerekçesiz iade talep edebilir. Hizmeti kullanmaya başladıktan sonra bu hak kullanılamaz
          (GDPR e-ticaret direktifi hükmü gereği).
        </li>
        <li>
          <strong>Teknik arıza:</strong> Ciddi bir teknik sorun nedeniyle hizmetten yararlanamadıysanız
          fatura tarihinden itibaren <strong>7 gün</strong> içinde talepte bulunun; değerlendireceğiz.
        </li>
        <li>
          <strong>Türkiye:</strong> Mesafeli Satışlar Yönetmeliği kapsamında, dijital içeriğe erişim başladıktan
          sonra cayma hakkı kullanılamaz.
        </li>
      </ul>

      <h2>3. İade Talebi</h2>
      <p>
        <a href="mailto:billing@netoku.app">billing@netoku.app</a> adresine e-posta gönderin; konu kısmına
        "İade Talebi" yazın. Fatura numaranızı ekleyin. En geç 5 iş günü içinde yanıtlarız.
      </p>

      <h2>4. Deneme Süreci</h2>
      <p>
        Free plan ücretsiz olduğundan iade konusu değildir. Ücretli plana geçmeden önce Free planı
        denemenizi öneririz.
      </p>
    </LegalLayout>
  );
}