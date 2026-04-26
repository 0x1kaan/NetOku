import { LegalLayout } from './LegalLayout';

export function Terms() {
  return (
    <LegalLayout title="Kullanım Şartları" updated="14 Nisan 2026">
      <p>
        Bu Kullanım Şartları ("Şartlar"), NetOku web uygulamasının ("Hizmet") kullanımını düzenler.
        Hizmeti kullanarak bu Şartları kabul etmiş sayılırsınız.
      </p>

      <h2>1. Hizmetin Kapsamı</h2>
      <p>
        NetOku, optik okuyucu cihazlardan elde edilen .txt formatındaki sınav verilerini analiz eder,
        ders bazlı net/puan hesaplar ve Excel raporu üretir. Hizmet "olduğu gibi" sunulur;
        sınav değerlendirme kararlarının doğrulanması kullanıcının sorumluluğundadır.
      </p>

      <h2>2. Hesap ve Güvenlik</h2>
      <ul>
        <li>Hesap açmak için geçerli bir e-posta adresi gereklidir.</li>
        <li>Şifrenizin gizliliğinden siz sorumlusunuz.</li>
        <li>Hesap 16 yaş altı kullanıcılar için açılamaz.</li>
        <li>Hesabınızı istediğiniz zaman kapatabilirsiniz.</li>
      </ul>

      <h2>3. Planlar ve Ödeme</h2>
      <ul>
        <li>Free plan: Sınırsız analiz, ücretsiz.</li>
        <li>Pro plan: Aylık $19, sınırsız analiz.</li>
        <li>School plan: Aylık $99, ekip özellikleri.</li>
        <li>Ödemeler Polar.sh üzerinden alınır. Polar, merchant of record olarak KDV/VAT tahsil eder.</li>
        <li>Abonelik otomatik yenilenir; iptal bir sonraki fatura döngüsünden önce yapılmalıdır.</li>
      </ul>

      <h2>4. Kullanıcı Sorumlulukları</h2>
      <ul>
        <li>Hizmeti yasalara uygun kullanmayı kabul edersiniz.</li>
        <li>Başkalarına ait öğrenci verilerini işlerken yasal temelinizin (veli onayı, yasal yükümlülük, meşru menfaat) olması gerekir.</li>
        <li>Hizmeti tersine mühendislik, zararlı yazılım yükleme veya aşırı istek gönderme amaçlı kullanamazsınız.</li>
      </ul>

      <h2>5. Fikri Mülkiyet</h2>
      <p>
        NetOku markası, logosu ve yazılımı NetOku'ya aittir. Yüklediğiniz veriler ve ürettiğiniz raporlar size aittir;
        Hizmeti sunmak için gerekli minimum yetkiyi bize vermiş olursunuz.
      </p>

      <h2>6. Sorumluluk Sınırı</h2>
      <p>
        NetOku, doğrudan veya dolaylı hiçbir veri kaybı, kâr kaybı veya sınav sonucu yanlış değerlendirmesinden
        yasalar çerçevesinde maksimum son 12 ay ödediğiniz tutar kadar sorumlu tutulabilir.
      </p>

      <h2>7. Hizmetin Sonlandırılması</h2>
      <p>
        Şartları ihlal ederseniz hesabınızı bildirim yaparak askıya alabilir veya kapatabiliriz.
        Hizmeti tamamen sonlandırmamız durumunda en az 30 gün önceden e-posta ile haber verilir.
      </p>

      <h2>8. Uygulanacak Hukuk</h2>
      <p>
        Bu Şartlar Türkiye Cumhuriyeti hukukuna tabidir. Uyuşmazlıklarda İstanbul mahkemeleri yetkilidir.
      </p>

      <h2>9. İletişim</h2>
      <p>Sorularınız için: <a href="mailto:legal@netoku.app">legal@netoku.app</a></p>
    </LegalLayout>
  );
}
