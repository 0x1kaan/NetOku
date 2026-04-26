import { LegalLayout } from './LegalLayout';

export function Cookies() {
  return (
    <LegalLayout title="Çerez Politikası" updated="14 Nisan 2026">
      <p>
        NetOku, Hizmeti sunmak ve geliştirmek için çerez ve benzeri teknolojiler kullanır.
        Bu sayfada hangi çerezleri neden kullandığımızı açıklıyoruz.
      </p>

      <h2>1. Zorunlu Çerezler</h2>
      <p>
        Hizmetin çalışması için gereklidir. Onay gerektirmez.
      </p>
      <ul>
        <li><strong>sb-*-auth-token</strong> (Supabase) - Oturum açma durumu. Süre: 7 gün.</li>
        <li><strong>netoku-consent</strong> - Çerez tercihiniz. Süre: 6 ay.</li>
      </ul>

      <h2>2. Analitik Çerezler</h2>
      <p>
        Hizmeti nasıl kullandığınızı anlamamıza yardımcı olur. Onayınız olmadan etkinleşmez.
      </p>
      <ul>
        <li><strong>PostHog</strong> (ph_*) - sayfa ziyaretleri, özellik kullanımı. Süre: 12 ay.</li>
      </ul>

      <h2>3. Pazarlama Çerezleri</h2>
      <p>
        Şu anda pazarlama çerezi kullanmıyoruz. Gelecekte eklersek bu politika güncellenir ve ayrıca onayınız istenir.
      </p>

      <h2>4. Tercihinizi Yönetmek</h2>
      <p>
        Sitemize ilk girişinizde çerez banner'ından tercihinizi belirleyebilirsiniz.
        İstediğiniz zaman tarayıcınızdaki <code>netoku-consent</code> çerezini silerek tercihi sıfırlayabilirsiniz.
        Tarayıcı ayarlarınızdan da çerezleri bloklayabilirsiniz, ancak bu durumda Hizmet tam çalışmayabilir.
      </p>

      <h2>5. İletişim</h2>
      <p>Sorularınız için: <a href="mailto:privacy@netoku.app">privacy@netoku.app</a></p>
    </LegalLayout>
  );
}