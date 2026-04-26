import { LegalLayout } from './LegalLayout';

export function Contact() {
  return (
    <LegalLayout title="İletişim" updated="14 Nisan 2026">
      <p>Bize aşağıdaki kanallardan ulaşabilirsiniz. Genellikle 1-2 iş günü içinde yanıtlarız.</p>

      <h2>Genel Destek</h2>
      <p><a href="mailto:destek@netoku.app">destek@netoku.app</a></p>

      <h2>Fatura ve Abonelik</h2>
      <p><a href="mailto:billing@netoku.app">billing@netoku.app</a></p>

      <h2>Gizlilik ve KVKK/GDPR</h2>
      <p><a href="mailto:privacy@netoku.app">privacy@netoku.app</a></p>

      <h2>Hukuki</h2>
      <p><a href="mailto:legal@netoku.app">legal@netoku.app</a></p>

      <h2>Güvenlik Açığı Bildirimi</h2>
      <p>
        Bir güvenlik açığı keşfettiyseniz lütfen kamuya açıklamamadan önce{' '}
        <a href="mailto:security@netoku.app">security@netoku.app</a> adresine bildirin.
        Responsible disclosure politikası uyguluyoruz.
      </p>
    </LegalLayout>
  );
}
