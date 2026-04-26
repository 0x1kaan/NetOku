import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Arrow,
  Avatar,
  BigNum,
  Eyebrow,
  Mono,
  Rule,
  Sticker,
} from '@/components/ui/brutal';

const logos = [
  'Kırmızı Lise',
  'Atlas Koleji',
  'Yıldız Kurs',
  'Sezer Okulları',
  'Adım Dershanesi',
  'Ege Akademi',
];

const steps = [
  {
    n: '01',
    title: 'Yükle',
    desc: '.txt dosyasını sürükle. NetOku formatı tanır, kolonları kendiliğinden eşler.',
    bg: 'bg-primary-tint',
  },
  {
    n: '02',
    title: 'Yapılandır',
    desc: "Dersler, soru sayıları, puan kriterleri. Preset'ten yükle, saniyeler içinde hazır.",
    bg: 'bg-pop',
  },
  {
    n: '03',
    title: 'Al',
    desc: 'Ders bazlı net, Excel raporu, OBS için not aktarımı. İşte o kadar.',
    bg: 'bg-destructive-tint',
  },
];

const features = [
  { t: 'Otomatik anahtar', d: 'Boş öğrenci no = cevap anahtarı. A/B/C/D kitapçık desteği.' },
  { t: 'Esnek kriterler', d: '¼, ⅓, ½, 1 puan yanlış götürme kuralları. Serbest cevap (*) desteği.' },
  { t: 'Hatalı no düzelt', d: 'Eksik/hatalı öğrenci numaralarını anında işaretler, düzelttirir.' },
  { t: 'Preset kaydı', d: 'Tekrarlı işleri tek tıkla çalıştır. TYT/AYT şablonları hazır.' },
  { t: 'Excel çıktısı', d: 'Genel, ders bazlı, OBS aktarımı — 3 ayrı sayfa.' },
  { t: 'Renk kodlu görüntü', d: 'Yeşil doğru, kırmızı yanlış, boş griler. Her soru görünür.' },
  { t: 'Takım ekranı', d: 'School planında 5 kullanıcı, ortak preset, paylaşılan arşiv.' },
  { t: 'KVKK/GDPR uyumlu', d: 'Ham dosya sadece tarayıcıda. Şifreli saklama. İstediğin zaman sil.' },
];

const tCards = [
  { q: 'Artık deneme gecesi kabusu bitti.', n: 'Ayşe K.', r: 'Matematik Öğr.', bg: 'bg-pop' },
  { q: 'Hatalı numaraları gösteriyor. Bu inanılmaz.', n: 'Elif S.', r: 'Dershane Yön.', bg: 'bg-primary-tint' },
  { q: 'Türkçe olması ayrı güzel. Kızımın ödevini bile yapıyorum.', n: 'Murat T.', r: 'Fen Öğr.', bg: 'bg-destructive-tint' },
  { q: 'OBS aktarma zaman kurtarıyor.', n: 'Seda K.', r: 'İdareci', bg: 'bg-success-tint' },
];

function NLogo({ size = 38 }: { size?: number }) {
  return (
    <div
      className="grid place-items-center bg-primary text-white border-2 border-ink shadow-brutal-sm font-display"
      style={{ width: size, height: size, fontSize: size * 0.58 }}
    >
      N
    </div>
  );
}

export function Landing() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 800);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="min-h-screen bg-cream text-ink font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b-2 border-ink bg-cream">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-7 py-3.5">
          <Link to="/" className="flex items-center gap-2.5">
            <NLogo />
            <span className="font-display text-[28px] leading-none">NetOku</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link to="/pricing">
              <Button variant="ghost" size="sm">Fiyatlar</Button>
            </Link>
            <Link to="/auth">
              <Button variant="paper" size="sm">Giriş</Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button variant="primary" size="sm">Başla — Ücretsiz</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-[1200px] px-7 pb-10 pt-20">
        <div className="mb-7 flex flex-wrap items-center gap-3">
          <Sticker color="pop" rotate={-4}>★ Öğretmen dostu</Sticker>
          <Sticker color="primary-tint" rotate={2}>v2026 · Taze</Sticker>
        </div>
        <h1 className="mb-7 max-w-[980px] font-display text-[clamp(48px,7vw,96px)] leading-[0.95] tracking-[-0.03em]">
          Optik formu yükle. <em className="italic text-primary">İki kahve</em> içimi sonunda rapor hazır.
        </h1>
        <p className="mb-9 max-w-[640px] text-[20px] leading-[1.5] text-ink-muted">
          NetOku; OMR cihazından çıkan <Mono>.txt</Mono> dosyasını okur, cevap anahtarını kendiliğinden yakalar,
          ders bazlı netleri hesaplar, <strong className="font-semibold text-ink">Excel'i saniyeler içinde</strong>{' '}
          önüne koyar.
        </p>
        <div className="mb-13 flex flex-wrap gap-3.5">
          <Link to="/auth?mode=signup">
            <Button variant="ink" size="xl" className="gap-2.5">
              Demo ile dene <Arrow size={18} className="text-white" />
            </Button>
          </Link>
          <Link to="/pricing">
            <Button variant="paper" size="xl">Planları gör</Button>
          </Link>
        </div>

        {/* Hero demo panel */}
        <div className="mt-10 grid gap-5 md:grid-cols-[1.2fr_1fr]">
          {/* Terminal-style file preview */}
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b-2 border-ink bg-ink px-4 py-2.5 text-cream">
              <span className="font-mono text-xs">sinav_2026_nisan.txt</span>
              <span className="font-mono text-[11px] text-pop">● okunuyor</span>
            </div>
            <div className="bg-[#FDFCF7] px-5 py-[18px] font-mono text-xs leading-[1.9]">
              <div>AHMET YILMAZ       25860121540  A  ABCDABCDABCD…</div>
              <div>MELİSA AYDIN       25860121541  B  DCBADCBADCBA…</div>
              <div>EMRE DEMİR         25860121542  A  ABCDDCBAABCD…</div>
              <div className="-mx-1.5 bg-pop px-1.5 py-[2px] font-bold">
                {'                   00000000000  A  ABCDABCDABCD…'} ← anahtar
              </div>
              <div>ZEYNEP ÇELIK       25860121544  B  DCBADCBBDCBA…</div>
              <div>{tick % 2 === 0 ? '▊' : '\u00A0'}</div>
            </div>
          </Card>

          {/* Result card */}
          <Card className="bg-pop p-6">
            <Eyebrow color="ink">Sonuç</Eyebrow>
            <div className="mt-2 flex items-baseline gap-2">
              <BigNum className="text-[100px]">7</BigNum>
              <span className="font-sans text-[28px] font-bold">sn</span>
            </div>
            <div className="mt-1 text-sm text-ink">ortalama işlem süresi</div>
            <Rule className="my-5" />
            <div className="flex gap-6">
              <div>
                <div className="font-display text-[32px] leading-none">142</div>
                <div className="text-[11px] uppercase tracking-[0.08em]">öğrenci</div>
              </div>
              <div>
                <div className="font-display text-[32px] leading-none">5</div>
                <div className="text-[11px] uppercase tracking-[0.08em]">ders</div>
              </div>
              <div>
                <div className="font-display text-[32px] leading-none">%100</div>
                <div className="text-[11px] uppercase tracking-[0.08em]">doğruluk</div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Logo marquee */}
      <section className="overflow-hidden border-y-2 border-ink bg-ink py-[18px]">
        <div className="flex w-max items-center gap-12 whitespace-nowrap font-display text-[28px] text-cream animate-marquee">
          {[...logos, ...logos, ...logos].map((l, i) => (
            <span key={i} className="flex items-center gap-12">
              <span className="opacity-90">{l}</span>
              <span className="text-pop">✦</span>
            </span>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-[1200px] px-7 py-24">
        <Eyebrow>— Nasıl çalışır</Eyebrow>
        <h2 className="my-4 mb-14 max-w-[720px] font-display text-[clamp(36px,5vw,68px)] leading-[1.02] tracking-[-0.02em]">
          Üç adım. Üç. <em className="italic text-primary">Gerçekten.</em>
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <Card key={s.n} className={`${s.bg} min-h-[260px] p-7`}>
              <div className="font-display text-[72px] leading-none text-ink">{s.n}</div>
              <Rule className="mb-4 mt-5" />
              <h3 className="mb-2.5 font-display text-[32px] leading-tight">{s.title}</h3>
              <p className="text-[15px] leading-[1.55] text-ink">{s.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Features grid (dark) */}
      <section className="border-t-2 border-ink bg-ink px-7 py-24 text-cream">
        <div className="mx-auto max-w-[1200px]">
          <Eyebrow color="pop">— Kaput altı</Eyebrow>
          <h2 className="my-4 max-w-[720px] font-display text-[clamp(36px,5vw,68px)] leading-[1.02] tracking-[-0.02em] text-cream">
            Masaüstü programların yapabildiği her şey. Web'de.{' '}
            <em className="italic text-pop">Daha hızlı.</em>
          </h2>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <div
                key={f.t}
                className={`border-2 border-cream p-5 ${i === 0 ? 'bg-primary' : 'bg-transparent'}`}
              >
                <div className="mb-1.5 font-display text-[20px] leading-tight">{f.t}</div>
                <div className={`text-[13px] leading-[1.55] ${i === 0 ? 'text-white' : 'text-[#BFB9AD]'}`}>
                  {f.d}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-[1200px] px-7 py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <Eyebrow>— Öğretmenler diyor ki</Eyebrow>
            <h2 className="my-4 mb-5 font-display text-[clamp(36px,4.5vw,56px)] leading-[1.05] tracking-[-0.02em]">
              "Eskiden <em className="italic text-primary">2 saat</em>, şimdi{' '}
              <em className="italic text-destructive">5 dakika.</em>"
            </h2>
            <p className="text-[17px] leading-[1.6] text-ink-muted">
              600 öğrencilik dershanemiz için her deneme sonrası çekmece çekmece kağıt karıştırıyordum.
              NetOku'dan sonra ders zili çalmadan sonuçları paylaşıyoruz.
            </p>
            <div className="mt-7 flex items-center gap-3.5">
              <Avatar name="Mehmet" size={52} />
              <div>
                <div className="text-base font-bold">Mehmet D.</div>
                <div className="text-[13px] text-ink-muted">
                  Rehber öğretmen, Kırmızı Lise · 600 öğrenci
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {tCards.map((t) => (
              <Card key={t.n} className={`${t.bg} p-[18px]`}>
                <div className="mb-3 font-display text-[22px] leading-[1.2]">"{t.q}"</div>
                <Rule />
                <div className="mt-3 flex items-center gap-2">
                  <Avatar name={t.n} size={28} />
                  <div>
                    <div className="text-xs font-bold">{t.n}</div>
                    <div className="text-[11px] text-ink-muted">{t.r}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-7 pb-24">
        <div className="relative mx-auto max-w-[1200px] overflow-hidden border-2 border-ink bg-primary px-12 py-[72px] text-center shadow-brutal-xl">
          <div className="absolute right-7 top-5">
            <Sticker color="pop" rotate={8}>Ücretsiz dene</Sticker>
          </div>
          <h2 className="mb-4 font-display text-[clamp(48px,7vw,96px)] leading-[0.95] tracking-[-0.03em] text-white">
            Başlayalım mı, <em className="italic text-pop">hocam?</em>
          </h2>
          <p className="mx-auto mb-9 max-w-[520px] text-lg text-white/85">
            30 saniyede hesap aç. Kredi kartı gerekmez. İstediğin zaman iptal et.
          </p>
          <Link to="/auth?mode=signup">
            <Button variant="pop" size="xl" className="gap-2.5">
              Hesabı oluştur <Arrow />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="mx-auto max-w-[1200px] border-t-2 border-ink px-7 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-[13px]">© {new Date().getFullYear()} NetOku — Kolay gelsin.</span>
          <nav className="flex flex-wrap gap-5 text-[13px]">
            <Link to="/pricing" className="hover:underline">Fiyatlar</Link>
            <Link to="/privacy" className="hover:underline">Gizlilik</Link>
            <Link to="/terms" className="hover:underline">KVKK</Link>
            <Link to="/contact" className="hover:underline">İletişim</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
