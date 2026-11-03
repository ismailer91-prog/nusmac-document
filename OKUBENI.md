# Nusmac Document – kaynak kod

Bu klasör programın kaynak kodudur. Geliştirmeye Claude Code ile devam etmek için hazırlandı.

## Gerekenler
1. **Node.js** (LTS sürüm): https://nodejs.org
2. **Claude Code**: kurulum için https://docs.claude.com/en/docs/claude-code

## İlk kurulum
Bu klasörde bir terminal açın (klasöre sağ tık → "Terminalde aç") ve:

```
npm install
npm start
```

`npm start` programı açar. Değişikliklerden sonra tekrar `npm start` yeterli.

## Windows kurulum dosyası üretmek
```
npm run dist
```
`dist` klasöründe **kurulum programı** (masaüstü kısayolu, PDF'e sağ tık "Birlikte aç" kaydı ve kendi N simgesiyle) ve **taşınabilir sürüm** oluşur.

## Claude Code ile devam etmek
Bu klasörde `claude` komutunu çalıştırın. Claude, `CLAUDE.md` dosyasını okuyarak projenin yapısını öğrenir.
Asıl kaynak `src/` klasörüdür (`index.html`, `styles.css`, `js/`); `app/index.html` her `npm start` / `npm test` / `npm run dist` sırasında ondan üretilir.

Testler: `npm test`. Tarayıcıda açılan tek dosyalık sürüm: `dist-web/nusmac.html` (build sırasında üretilir).

## Windows kurulum dosyası (GitHub'dan)
Kod GitHub'a gönderildiğinde testler ve Windows kurulum dosyası kendiliğinden hazırlanır: GitHub'da depo → **Actions** → son çalıştırma → **Artifacts** → `NusmacDocument-Windows`.
