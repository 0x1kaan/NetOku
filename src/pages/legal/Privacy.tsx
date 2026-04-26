import { LegalLayout } from './LegalLayout';

export function Privacy() {
  return (
    <LegalLayout title="Gizlilik Politikası" updated="14 Nisan 2026">
      <p>
        Bu Gizlilik Politikası, NetOku'nun kişisel verileri KVKK (6698 sayılı Kanun) ve GDPR çerçevesinde
        nasıl işlediğini açıklar.
      </p>

      <h2>1. Veri Sorumlusu</h2>
      <p>
        NetOku, veri sorumlusu sıfatıyla hareket eder.
        İletişim: <a href="mailto:privacy@netoku.app">privacy@netoku.app</a>
      </p>

      <h2>2. İşlenen Veriler</h2>
      <ul>
        <li><strong>Hesap verileri:</strong> e-posta adresi, şifre hash'i, hesap oluşturma tarihi.</li>
        <li><strong>Ödeme verileri:</strong> Polar.sh üzerinden işlenir; kart bilgisi sunucularımızda saklanmaz.</li>
        <li><strong>Sınav verileri:</strong> yüklediğiniz .txt dosyalarındaki öğrenci adı, numara ve yanıtlar.</li>
        <li><strong>Kullanım verileri:</strong> IP adresi, tarayıcı tipi, sayfa ziyaretleri (PostHog üzerinden).</li>
      </ul>

      <h2>3. İşleme Amaçları ve Hukuki Sebep</h2>
      <ul>
        <li>Hizmeti sunmak ve hesabınızı yönetmek (sözleşmenin ifası - KVKK m.5/2-c).</li>
        <li>Faturalama ve yasal yükümlülükler (yasal zorunluluk - KVKK m.5/2-a).</li>
        <li>Hizmet geliştirme ve istatistik (meşru menfaat - KVKK m.5/2-f).</li>
        <li>Pazarlama iletişimi (açık rıza - KVKK m.5/1, ayrıca opt-in).</li>
      </ul>

      <h2>4. Veri Aktarımı</h2>
      <p>
        Aşağıdaki veri işleyenleri kullanıyoruz:
      </p>
      <ul>
        <li><strong>Supabase</strong> (AB sunucuları) - veritabanı ve kimlik doğrulama</li>
        <li><strong>Polar.sh</strong> (ABD) - ödeme ve faturalama</li>
        <li><strong>Vercel</strong> (küresel CDN) - web hosting</li>
        <li><strong>PostHog</strong> (AB sunucuları) - ürün analitiği</li>
      </ul>
      <p>
        ABD aktarımları için Standart Sözleşme Maddeleri (SCC) uygulanır.
      </p>

      <h2>5. Saklama Süreleri</h2>
      <ul>
        <li>Hesap verileri: hesap aktif olduğu sürece + kapatma sonrası 90 gün.</li>
        <li>Sınav verileri: kullanıcı silene kadar; hesap kapatılırsa hemen silinir.</li>
        <li>Fatura kayıtları: vergi mevzuatı gereği 10 yıl.</li>
        <li>Kullanım logları: 12 ay.</li>
      </ul>

      <h2>6. Haklarınız</h2>
      <p>KVKK m.11 ve GDPR m.15-22 kapsamında:</p>
      <ul>
        <li>Verilerinize erişim, düzeltme ve silme talebi</li>
        <li>İşlemeye itiraz ve kısıtlama talebi</li>
        <li>Veri taşınabilirliği (machine-readable export)</li>
        <li>Otomatik kararlara itiraz</li>
        <li>İzni istediğiniz zaman geri alma</li>
      </ul>
      <p>
        Taleplerinizi <a href="mailto:privacy@netoku.app">privacy@netoku.app</a> adresine gönderebilirsiniz.
        En geç 30 gün içinde yanıtlarız.
      </p>

      <h2>7. Güvenlik</h2>
      <ul>
        <li>Tüm trafiğimiz TLS 1.3 ile şifrelidir.</li>
        <li>Veritabanı erişimi Row Level Security (RLS) ile kullanıcı başına izole edilir.</li>
        <li>Şifreler bcrypt ile hash'lenir (Supabase Auth).</li>
        <li>Veri ihlali durumunda 72 saat içinde KVKK Kurumu'na ve etkilenen kullanıcılara bildirim yapılır.</li>
      </ul>

      <h2>8. Çocukların Verileri</h2>
      <p>
        NetOku 16 yaş altı kullanıcılara hizmet vermez. Yüklediğiniz sınav verileri öğrencilere ait olabilir;
        bu veriler için öğretmenin/okulun yasal temelle hareket ettiğini taahhüt ettiğini varsayarız.
      </p>

      <h2>9. Değişiklikler</h2>
      <p>
        Bu politikayı güncelleyebiliriz. Önemli değişiklikleri e-posta ile bildiririz; küçük değişiklikler
        bu sayfadaki "son güncelleme" tarihi ile yansıtılır.
      </p>
    </LegalLayout>
  );
}