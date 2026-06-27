# Mereketoi — App Store + Play Market шығару чеклисті

> Күй белгілері: ✅ дайын · 🟡 әрекет қажет (кодта жасалды немесе нұсқа берілді) · 🔴 блокер · ⬜ стор-консольде қолмен

## 0. Блокерлер (болмаса қабылданбайды)

- 🟡 **Аккаунтты жою (in-app)** — мобайл жағы қосылды: `Параметрлер → Қауіпті аймақ → Аккаунтты жою`
  (`app/settings.tsx`, `stores/authStore.ts → deleteAccount`, `services/api/auth.ts → deleteAccount`,
  `services/api/endpoints.ts → meDelete: '/me/delete'`).
  - 🔴 **БЭКЕНД ТЕКСЕРУ ҚАЖЕТ:** `POST /api/v1/me/delete` (Bearer) маршруты серверде болуы шарт.
    Ол: пайдаланушыны + хабарландыруларын/броньдарын/таңдаулыларын/device-токендерін каскадты өшіріп,
    токенді жарамсыз етіп, `{ "success": true, "data": { "deleted": true } }` қайтаруы керек.
    Маршрут аты басқа болса — `endpoints.ts` ішіндегі бір жолды түзетіңіз.
  - ⬜ **Google Play Data deletion:** in-app жолдан бөлек, аккаунт/дерек жоюды сұрайтын **веб-URL** да керек
    (мыс. `https://mereketoi.kz/account/delete`). Оны Play Console → Data safety-ге енгізіңіз.

## 1. EAS жобасын инициализациялау (push + билд үшін міндетті)

`app.json`-да `extra.eas.projectId` де, `owner` де жоқ → push токен алынбайды, билд алу мүмкін емес.

```bash
npx eas-cli login          # Expo аккаунтыңызбен кіріңіз
npx eas-cli init           # projectId + owner-ды app.json-ға автоматты жазады
```

- ⬜ Android push үшін FCM кілттері: `npx eas-cli credentials` (немесе билд кезінде сұрайды).
- ⬜ iOS push үшін APNs кілті EAS арқылы конфигурацияланады (Apple Developer аккаунты қажет).

## 2. Билд + жіберу

```bash
npx eas-cli build --platform android --profile production   # .aab
npx eas-cli build --platform ios --profile production       # Apple Developer аккаунты қажет
npx eas-cli submit --platform android --latest
npx eas-cli submit --platform ios --latest
```

- ✅ `eas.json`: production Android = app-bundle, autoIncrement қосулы.
- ⬜ iOS: Apple Developer Program ($99/жыл) тіркелуі. Android: Google Play Console ($25 бір рет).

## 3. Стор-консоль талаптары (кодта емес — қолмен)

### Екеуіне ортақ
- ⬜ Privacy Policy URL: `https://mereketoi.kz/page/privacy` (қосымшада бар, консольге де енгізу керек).
- ⬜ Терминал/қолдау байланысы (email), қолдау URL.
- ⬜ Screenshot-тар: телефон (міндетті). iOS-та `supportsTablet: true` болғандықтан **iPad screenshot** да керек.
      (Қаламасаңыз `app.json` → `ios.supportsTablet: false` етіп, iPad-ты алып тастаңыз.)
- ⬜ Қысқа + толық сипаттама (kk/ru), категория, кілт сөздер.

### Apple App Store
- ⬜ **App Privacy** формасы: Аккаунт деректері, Фото, Идентификатор (push токен), Қаржы (төлем тарихы).
- ⬜ **App Review демо-аккаунты** — booking/«Хабарландыруларым» кіруді талап етеді (қонақ тек қарай алады).
      Review Notes-та логин/құпиясөз беріңіз.
- ✅ `ITSAppUsesNonExemptEncryption: false` орнатылған (encryption сұрағы автоматты жабылады).
- 🟡 **Төлем (3.1.1) — §6 қараңыз.**

### Google Play
- ⬜ **Data safety** формасы (App Privacy-ге ұқсас) + жоғарыдағы дерек-жою веб-URL.
- ⬜ Content rating сауалнамасы.
- ⬜ Target API level: Expo SDK 54 / RN 0.81 → API 35 (қазіргі талапқа сай) ✅.

## 4. Қауіпсіздік — тексерілді ✅

- ✅ Токен тек SecureStore-да (Keychain/Keystore), логқа жазылмайды.
- ✅ Барлық трафик HTTPS (`https://mereketoi.kz`).
- ✅ 401 → автоматты session тазалау; logout-та push токен серверден алынады.
- ✅ Браузер-авторизация: `state` nonce (CSRF), ephemeral session.
- ✅ Төлем: баға/құпиялар серверде, клиентке тек `checkout_url`.
- ✅ Кодта hardcode құпия кілт жоқ; `.env`-те тек публичный URL.
- ✅ CMS HTML WebView-сіз рендерленеді (XSS жоқ).

## 5. Дизайн / иконкалар — тексерілді ✅ / 🟡

- ✅ `icon.png` 1024×1024, `splash-icon.png` 1024×1024.
- ✅ Design-token жүйесі, Quicksand, kk/ru локализация, Loading/Empty/Error күйлері.
- 🟡 Android adaptive icon foreground/background **512×512** — Google 1024×1024 (432dp қауіпсіз аймақ) ұсынады.
      Блокер емес, бірақ сапа үшін үлкейткен жөн. Monochrome 432×432 — жарайды.

## 6. iOS төлем тәуекелі (3.1.1) — назар аударыңыз 🟡

Қазір iOS-та төлем UI жоқ, пайдаланушы сайтқа бағытталады (`billing.ts`, `packagesIosWeb` жолы).
Бұл — IAP комиссиясынан қашудың ең қарапайым жолы, бірақ Apple тәуекелі бар:

- **listing_publish / boost / featured / plan / credit_pack** цифрлық қызмет деп саналса,
  Apple 3.1.1 бойынша қосымша ішіндегі цифрлық тауарды **сыртқы төлемге сілтегені** үшін қабылдамауы мүмкін.
- **Қорғаныс позициясы:** Mereketoi — нақты әлемдегі мереке-қызметтердің маркетплейсі; ақылы функциялар
  провайдердің бизнесін жүргізу үшін (marketplace seller fee тәрізді), цифрлық контент тұтыну емес.
  Бұл жағдайда сыртқы төлемге рұқсат етіледі (Apple 3.1.3(e) "reader"/marketplace ерекшеліктерімен ұқсас).
- **Ұсыныс (қауіпсіз нұсқа):** iOS-та ақылы функциялар туралы UI-ды мүлдем көрсетпеу
  (тек сайтта басқарылады деген бейтарап ескертпе), сатуға итермелейтін «Сатып алу/Төлеу» CTA болмасын.
  Бұл қазіргі тәсілге жақын — review-ге жіберер алдында осы тұжырымды App Review Notes-та түсіндіріп қойыңыз.
- Балама (кепілді өту, бірақ 15–30% комиссия): iOS-та сандық пакеттерге StoreKit IAP қосу.
