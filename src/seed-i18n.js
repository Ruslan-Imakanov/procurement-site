// Стартовые переводы (казахский и английский) как «наложение» на русский контент из seed.js.
// Пустое или отсутствующее поле = берётся русский текст. Числа, ссылки и картинки берутся из русской версии.
// Списки сопоставляются с русскими по порядку. Всё это редактируется в админке (вкладки «Қаз» и «Eng»).

const ctaKk = { title: 'Сатып алуларыңызды талқылайық', text: 'Міндетіңізді айтыңыз — бір жұмыс күні ішінде фирма серіктесі алғашқы кездесу форматын ұсынады.', button: { label: 'Бізбен байланысу' } };
const ctaEn = { title: "Let's talk about your procurement", text: 'Tell us about the task: within one business day a partner will propose a format for the first meeting.', button: { label: 'Contact us' } };

const PRIVACY_KK = `*Үлгі — жарияламас бұрын заңгермен келісіңіз және оператордың деректемелерін толтырыңыз.*

## 1. Жалпы ережелер

Бұл саясат [оператордың атауы, БСН, мекенжайы] (бұдан әрі — Оператор) сайт арқылы жеке деректерді қалай өңдейтінін сипаттайды. Өңдеу «Жеке деректер және оларды қорғау туралы» Қазақстан Республикасының 2013 жылғы 21 мамырдағы № 94-V Заңына сәйкес жүзеге асырылады.

## 2. Қандай деректер жиналады

- кері байланыс формасына өзіңіз енгізетін деректер: аты-жөні, компания, e-mail, телефон, хабарлама мәтіні;
- техникалық деректер: сұрау жіберілген ел, браузер туралы мәлімет, өтіп келген бет, жасырылған (хэштелген) IP-мекенжай;
- аналитика cookie-файлдары (Google Analytics) — тек сіздің келісіміңізбен.

## 3. Мақсаттары

Сұрауыңызға жауап беру және ұсыныс дайындау; сайтты жақсарту үшін жиынтық статистика.

## 4. Құқықтық негіз

Деректерді өңдеуге келісіміңіз — формадағы белгі. Келісімді кез келген уақытта төмендегі мекенжай бойынша кері қайтарып алуға болады.

## 5. Сақтау және беру

Деректер Оператор пайдаланатын хостингте (Cloudflare) сақталады және үшінші тұлғаларға заңда көзделген жағдайлардан басқа беріле алмайды. Келісім берілсе, аналитика деректері Google компаниясына беріледі, бұл шекара арқылы беруге жатуы мүмкін. Деректер мақсатқа жету үшін қажетті мерзімде сақталады.

## 6. Субъектінің құқықтары

Сіз өз деректеріңіз туралы ақпарат алуға, оларды түзетуге, өшіруге және келісімді қайтарып алуға құқылысыз. Өтінішті [e-mail] мекенжайына жіберіңіз.

## 7. Cookie

Аналитика cookie-лері «Қабылдау» батырмасын басқаннан кейін ғана қосылады. Таңдауды беттің төменгі жағындағы «Cookie параметрлері» сілтемесі арқылы өзгертуге болады.`;

const PRIVACY_EN = `*Template: have a lawyer review it and fill in the operator's details before publishing.*

## 1. General provisions

This policy describes how [operator name, BIN, address] (the "Operator") processes personal data collected through this website. Processing is carried out in accordance with the Law of the Republic of Kazakhstan "On Personal Data and Their Protection" of 21 May 2013 No. 94-V.

## 2. Data we collect

- data you enter in the contact form: name, company, e-mail, phone, message text;
- technical data: country of the request, browser information, referring page, a hashed IP address;
- analytics cookies (Google Analytics), only with your consent.

## 3. Purposes

To answer your request and prepare a proposal; aggregated statistics to improve the website.

## 4. Legal basis

Your consent to processing, given by ticking the box in the form. You can withdraw it at any time at the address below.

## 5. Storage and transfer

Data is stored with the hosting provider used by the Operator (Cloudflare) and is not passed to third parties except as required by law. If you consent, analytics data is sent to Google, which may constitute a cross-border transfer. Data is kept for as long as needed for the stated purposes.

## 6. Your rights

You may request information about your data, have it corrected or deleted, and withdraw your consent. Send your request to [e-mail].

## 7. Cookies

Analytics cookies are switched on only after you click "Accept". You can change your choice with the "Cookie settings" link at the bottom of any page.`;

export const SEED_I18N = {
  kk: {
    docs: {
      settings: {
        tagline: 'Стратегиялық сатып алу бойынша консалтинг',
        contacts: { address: 'Алматы қ., Мысал даңғылы, 1, 100-кеңсе', hours: 'Дс–Жм, 9:00–18:00' },
        nav: [{ label: 'Басты бет' }, { label: 'Біз туралы' }, { label: 'Қызметтер' }, { label: 'Талдау' }, { label: 'Жобалар' }, { label: 'Байланыс' }],
        headerCta: { label: 'Міндетті талқылау' },
        footer: {
          about: 'Тәуелсіз консалтинг фирмасы. Компанияларға иелік етудің жиынтық құнын төмендететін және жеткізу тізбегінің тәуекелдерін басқаратын сатып алу жүйесін құруға көмектесеміз.',
          copyright: '© {year} Меридиан. Барлық құқықтар қорғалған.',
          links: [{ label: 'Құпиялылық саясаты' }],
        },
        analytics: {
          bannerText: 'Біз келушілер санын талдау үшін cookie файлдарын (Google Analytics) қолданамыз. Аналитика тек сіздің келісіміңізбен қосылады.',
          acceptLabel: 'Қабылдау', declineLabel: 'Бас тарту', policyLabel: 'Толығырақ', settingsLabel: 'Cookie параметрлері',
        },
        seo: { titleSuffix: ' — Меридиан', description: 'Стратегиялық сатып алу бойынша консалтинг: санаттарды басқару, жеткізушілер мен тәуекелдерді басқару, сатып алу функциясын трансформациялау.' },
        ui: {
          readMore: 'Толығырақ', allArticles: 'Барлық материалдар', backToInsights: '← Барлық материалдарға', backToCases: '← Барлық жобаларға',
          servicesMenu: 'Мамандандырулар', contactsMenu: 'Байланыс', menuLabel: 'Мәзір', notFoundTitle: 'Бет табылмады',
          notFoundText: 'Мекенжай өзгерген болуы мүмкін. Басты беттен бастаңыз немесе мамандандыруларымызды қараңыз.',
          homeLabel: 'Басты бет', downloadLabel: 'Жүктеу', minRead: '{n} мин оқу',
          skipLabel: 'Мазмұнға өту', crumbsLabel: 'Бөлімдер бойынша навигация', mainMenuLabel: 'Негізгі мәзір', cookieLabel: 'Cookie туралы хабарлама',
          phoneLabel: 'Телефон', emailLabel: 'E-mail', addressLabel: 'Мекенжай', hoursLabel: 'Жұмыс уақыты', mapLabel: 'Картада',
          profileLabel: 'Профиль', topicsLabel: 'Тақырыптар', clientsLabel: 'Клиенттер', otherServices: 'Басқа мамандандырулар',
        },
      },
      'page:home': {
        hero: {
          eyebrow: 'Стратегиялық сатып алу бойынша консалтинг', title: 'Компания пайдасына жұмыс істейтін сатып алу',
          subtitle: 'Басшыларға сатып алуды шығын орталығынан тұрақты үнемдеу, жеткізу сенімділігі және бәсекелестік артықшылық көзіне айналдыруға көмектесеміз.',
          primary: { label: 'Міндетті талқылау' }, secondary: { label: 'Біздің мамандандырулар' },
        },
        trust: { title: 'Бізге сенім артады' },
        intro: {
          eyebrow: 'Біздің тәсіл', title: 'Бір реттік үнем емес, біз кеткеннен кейін де жұмыс істейтін жүйе',
          body: 'Біз «жылдам жеңістерді» сатпаймыз. Әр жоба шығындар мен тәуекелдерді талдаудан басталып, жұмыс істейтін процестермен, оқытылған командамен және P&L-дегі өлшенетін нәтижемен аяқталады.\n\nФирма серіктестері әр жобаны диагностикадан нәтижені бекітуге дейін жеке өзі жүргізеді.',
        },
        stats: [{ label: 'жыл сатып алу тәжірибесі' }, { label: 'санаттар бойынша әдеттегі үнем' }, { label: 'аяқталған жоба' }, { label: 'клиент қайта оралады' }],
        services: { eyebrow: 'Мамандандырулар', title: 'Бізде терең сараптама бар үш бағыт', text: 'Біз бәрін қамтуға тырыспаймыз — тек нәтиже сапасына кепілдік бере алатын міндеттерді аламыз.', linkLabel: 'Толығырақ' },
        approach: {
          eyebrow: 'Біз қалай жұмыс істейміз', title: 'Диагностикадан нәтижеге дейінгі ашық жол',
          steps: [
            { title: 'Диагностика', text: 'Шығындарды, шарттар мен процестерді талдау. 3–4 аптада мүмкіндіктер мен тәуекелдер картасы.' },
            { title: 'Стратегия', text: 'Басшылықпен келісілген санаттық стратегиялар, сатып алудың мақсатты моделі және бизнес-кейс.' },
            { title: 'Іске асыру', text: 'Сорсинг, келіссөздер, процестер мен жүйелердің өзгерісі — сіздің командаңызбен бірге.' },
            { title: 'Бекіту', text: 'Нәтиже жылдар бойы сақталуы үшін KPI, оқыту және құралдарды тапсыру.' },
          ],
        },
        insights: { eyebrow: 'Талдау', title: 'Сатып алу басшыларына арналған материалдар', linkLabel: 'Барлық материалдар' },
        testimonial: { quote: 'Команда негізгі санаттар бойынша шығынды азайтуға ғана емес, қазір біздің сатып алу қызметіміз өзі жүргізетін процесті құруға да көмектесті.', author: 'Д. Ержанов', role: 'қаржы директоры, өндірістік компания' },
        cta: ctaKk,
      },
      'page:about': {
        hero: { eyebrow: 'Біз туралы', title: 'Сатып алу саласындағы тәуелсіз сарапшылар', subtitle: 'Ірі компанияларда сатып алуды басқарған тәжірибелі практиктердің шағын командасы. Нәтижеге өз шығынымыз сияқты жауап береміз.' },
        story: {
          title: 'Тарих және миссия',
          body: 'Фирманы өнеркәсіпте, ритейлде және логистикада көп жыл сатып алуды басқарған практиктер құрды. Біз оңтайландыру жобалары қағаз жүзінде нәтиже беріп, бір жылдан кейін оны жоғалтатынын көрдік — сондықтан ең бастысы нәтиженің тұрақтылығы болатын әдістеме құрдық.\n\n**Біздің миссиямыз** — сатып алуды директорлар кеңесі, қаржы және бизнес сенетін стратегиялық функцияға айналдыру.',
        },
        stats: [{ label: 'жыл нарықта' }, { label: 'сала' }, { label: 'ел' }],
        values: {
          title: 'Жұмыс қағидаттары',
          items: [
            { title: 'Тәуелсіздік', text: 'Жеткізушілерден сыйақы алмаймыз. Ұсыныстар тек клиент мүддесі үшін.' },
            { title: 'Өлшенгіштік', text: 'Әр нәтиже деректермен расталып, қаржы қызметімен келісіледі.' },
            { title: 'Білім беру', text: 'Сіздің командаңызбен қатар жұмыс істеп, оған құралдар мен дағдыларды қалдырамыз.' },
            { title: 'Құпиялылық', text: 'Клиенттер деректері келісімдермен және ішкі саясатпен қорғалған.' },
          ],
        },
        team: {
          title: 'Команда', text: 'Фирма серіктестері әр жобаға жеке қатысады.',
          members: [
            { name: 'Әсел Нұрғалиева', role: 'Басқарушы серіктес', bio: 'Сатып алуда 15 жылдан астам, халықаралық өндірістік топта функцияны басқарған.' },
            { name: 'Данияр Қасымов', role: 'Серіктес, санаттарды басқару', bio: 'Шикізат және жанама санаттардағы сорсинг пен келіссөздер сарапшысы.' },
            { name: 'Ирина Волкова', role: 'Серіктес, сандық сатып алу', bio: 'Ритейл мен логистикада e-sourcing жүйелері мен шығындар аналитикасын енгізген.' },
          ],
        },
        credentials: {
          title: 'Біліктілік',
          items: [
            { title: 'CIPS', text: 'Chartered Institute of Procurement & Supply сертификатталған мамандары.' },
            { title: 'ISO 20400', text: 'Тұрақты сатып алу практикаларын енгізу тәжірибесі.' },
            { title: 'Салалық тәжірибе', text: 'Өнеркәсіп, FMCG, ритейл, логистика, энергетика, девелопмент.' },
          ],
        },
        cta: ctaKk,
      },
      'page:services': {
        hero: { eyebrow: 'Қызметтер', title: 'Мамандандырулар', subtitle: 'Біз ең көп құндылық беретін үш бағыт. Біреуінен бастап, нәтижелерге қарай кеңейтуге болады.' },
        intro: 'Барлық жобалар бизнес үшін өлшенетін нәтижеге құрылады: иелік етудің жиынтық құны, жеткізу сенімділігі, айналым капиталы және басқарылатын тәуекелдер.',
        why: {
          title: 'Неге бізді таңдайды',
          items: [
            { title: 'Теоретиктер емес, практиктер', text: 'Әр кеңесші нақты компанияда сатып алуды басқарған.' },
            { title: 'Нәтижеге жауапкершілік', text: 'Расталған нәтижеге байланысты төлем мүмкін.' },
            { title: 'Тұрақтылық', text: 'Процестерді, KPI мен оқытылған команданы қалдырамыз.' },
          ],
        },
        trust: { title: 'Бізбен жұмыс істейді' },
        cta: ctaKk,
      },
      'page:insights': {
        hero: { eyebrow: 'Талдау', title: 'Зерттеулер мен практикалық материалдар', subtitle: 'Жобалардан алынған бақылаулар, нарықтарға шолу және сатып алу мен қаржы басшыларына арналған құралдар.' },
        allLabel: 'Барлық тақырыптар', emptyText: 'Жақында мұнда жаңа материалдар пайда болады.',
        downloads: { title: 'Жүктеуге арналған материалдар', text: 'Біз ашық бөлісетін есептер, чек-парақтар және үлгілер.' },
        cta: ctaKk,
      },
      'page:cases': {
        hero: { eyebrow: 'Жобалар', title: 'Жоба мысалдары', subtitle: 'Таңдаулы жобалар. Клиенттердің атаулары тек олардың келісімімен ашылады.' },
        emptyText: 'Жоба мысалдары жақында пайда болады.', labels: { summary: 'Міндет', result: 'Нәтиже', metrics: 'Негізгі сандар' }, cta: ctaKk,
      },
      'page:contact': {
        hero: { eyebrow: 'Байланыс', title: 'Міндетіңізді айтыңыз', subtitle: 'Бір жұмыс күні ішінде жауап береміз. Алғашқы кездесу ешқандай міндеттеме жүктемейді.' },
        formTitle: 'Өтінім қалдыру', infoTitle: 'Бізбен қалай байланысуға болады',
        infoText: 'Хат алмасқанды қалайсыз ба? Поштаға жазыңыз — егжей-тегжейді талқылар алдында NDA жібереміз.',
      },
      'form:contact': {
        fields: [
          { label: 'Аты', placeholder: '' }, { label: 'Компания', placeholder: '' }, { label: 'E-mail', placeholder: 'name@company.com' }, { label: 'Телефон', placeholder: '' },
          { label: 'Тақырып', placeholder: 'Тақырыпты таңдаңыз', options: 'Стратегия және санаттарды басқару\nЖеткізушілер және тәуекелдер\nСатып алуды трансформациялау\nБасқа' },
          { label: 'Міндет туралы қысқаша', placeholder: '' },
          { label: 'Жеке деректерді [құпиялылық саясатына](/privacy) сәйкес өңдеуге келісемін', placeholder: '' },
        ],
        submitLabel: 'Жіберу', sendingLabel: 'Жіберілуде…', successTitle: 'Рақмет! Өтінім жіберілді', successText: 'Бір жұмыс күні ішінде сізбен байланысамыз.',
        errorText: 'Өтінімді жіберу мүмкін болмады. Қайталап көріңіз немесе бізге поштаға жазыңыз.', requiredText: 'Бұл өрісті толтырыңыз',
      },
    },
    entries: {
      'service:procurement-strategy': {
        title: 'Сатып алу стратегиясы және санаттарды басқару',
        excerpt: 'Шығындарды талдау, санаттық стратегиялар және сорсинг иелік етудің жиынтық құнын 8–15%-ға төмендетеді.',
        hero: { eyebrow: 'Мамандандыру', subtitle: 'Бытыраңқы сатып алуды әр санат бойынша түсінікті стратегиясы бар басқарылатын портфельге айналдырамыз.' },
        intro: 'Көптеген компаниялар **қанша** жұмсайтынын біледі, бірақ **неліктен** екенін білмейді. Біз шығындардың ашықтығынан бастап, нарықты, ішкі сұранысты және тәуекелдерді ескеретін санаттық стратегиялар құрамыз.',
        offerings: { title: 'Не кіреді', items: [
          { title: 'Шығындарды талдау (spend analysis)', text: 'Деректерді жіктеу және тазарту, санаттар, жеткізушілер және бөлімшелер бойынша шығындар картасы.' },
          { title: 'Санаттық стратегиялар', text: 'Сегменттеу, нарықты талдау, үнем тетіктері және әр санатқа жол картасы.' },
          { title: 'Стратегиялық сорсинг', text: 'Тендерлер, RFx, көп раундты келіссөздер және жеткізушілерді таңдау.' },
          { title: 'Сұранысты басқару', text: 'Бизнеспен бірге ерекшеліктерді стандарттау және тұтыну саясаты.' },
        ] },
        outcomes: { title: 'Әдеттегі нәтижелер', items: [{ label: 'мақсатты санаттардағы шығынның төмендеуі' }, { label: 'алғашқы расталған нәтижеге дейін' }, { label: 'шығындардың ашықтығы' }] },
        process: { title: 'Жұмыс кезеңдері', items: [
          { title: 'Диагностика', text: 'Деректерді жинау және талдау, сұхбаттар, мүмкіндіктер картасы.' },
          { title: 'Басымдық беру', text: 'Санаттар бойынша бизнес-кейс және толқындар жоспары.' },
          { title: 'Сорсинг', text: 'Сатып алуларды және жеткізушілермен келіссөздерді өткізу.' },
          { title: 'Бекіту', text: 'Шарттар, KPI, санаттық менеджерлерді оқыту.' },
        ] },
        clients: { title: 'Бағыттың клиенттері' },
        faq: { title: 'Жиі қойылатын сұрақтар', items: [
          { q: 'Қандай санаттардан бастаған дұрыс?', a: 'Көлемі үлкен, жеткізушілері бытыраңқы және шарттары көптен қайта қаралмаған санаттардан. Мұны диагностикадан кейін-ақ көруге болады.' },
          { q: 'Төлемді нәтижемен байланыстыруға бола ма?', a: 'Иә, біз тұрақты бөлігі және расталған үнемнен сыйақысы бар модельдерді ұсынамыз.' },
        ] },
        cta: ctaKk,
      },
      'service:supplier-risk': {
        title: 'Жеткізушілер мен тәуекелдерді басқару',
        excerpt: 'Жеткізушілерді сегменттеу, жеткізу тізбегінің тәуекелдерін бағалау және негізгі серіктестерді дамыту бағдарламалары.',
        hero: { eyebrow: 'Мамандандыру', subtitle: 'Жекелеген жеткізушілерге тәуелділікті азайтып, жеткізу тізбегінің тәуекелдерін көрінетін және басқарылатын етеміз.' },
        intro: 'Бір жеткізушідегі іркіліс тендерлерден түсетін жылдық үнемнен де қымбатқа түсуі мүмкін. Біз тиімділікті, тәуекелдерді және бірлескен дамуды біріктіретін жеткізушілерді басқару жүйесін (SRM) құрамыз.',
        offerings: { title: 'Не кіреді', items: [
          { title: 'Жеткізушілерді сегменттеу', text: 'Стратегиялық, негізгі және транзакциялық жеткізушілерді және олармен жұмыс үлгілерін анықтаймыз.' },
          { title: 'Жеткізу тізбегінің тәуекелдерін бағалау', text: 'Қаржылық, операциялық, географиялық және ESG тәуекелдері, сыни тәуелділіктер картасы.' },
          { title: 'Тиімділікті бағалау', text: 'Жеткізушілердің KPI-лары мен скоринг карталары, тұрақты бизнес-шолулар.' },
          { title: 'Үздіксіздік жоспарлары', text: 'Балама көздер, сақтандыру қорлары және әрекет ету сценарийлері.' },
        ] },
        outcomes: { title: 'Әдеттегі нәтижелер', items: [{ label: 'сыни жалғыз көздер үлесі' }, { label: 'іркілістерге жылдам әрекет' }, { label: 'негізгі жеткізушілер мониторингте' }] },
        process: { title: 'Жұмыс кезеңдері', items: [
          { title: 'Түгендеу', text: 'Жеткізушілер базасы, көлемдер мен сыни маңыздылық деректері.' },
          { title: 'Бағалау', text: 'Тәуекелдер мен тиімділік скорингі.' },
          { title: 'SRM моделі', text: 'Рөлдер, процестер, KPI және регламенттер.' },
          { title: 'Іске қосу', text: 'Негізгі жеткізушілерде пилот және масштабтау.' },
        ] },
        clients: { title: 'Бағыттың клиенттері' },
        faq: { title: 'Жиі қойылатын сұрақтар', items: [{ q: 'Арнайы жүйе қажет пе?', a: 'Бастапқыда жоқ. Біз түсінікті үлгілер мен процестерден бастаймыз, жүйені модель жұмыс істей бастағанда таңдаймыз.' }] },
        cta: ctaKk,
      },
      'service:procurement-transformation': {
        title: 'Сатып алуды трансформациялау және цифрландыру',
        excerpt: 'Мақсатты операциялық модель, саясаттар мен регламенттер, e-procurement және аналитика жүйелерін таңдау және енгізу.',
        hero: { eyebrow: 'Мамандандыру', subtitle: 'Бизнеспен бірге өсетін сатып алу функциясын құрамыз: адамдар, процестер, саясаттар және технологиялар.' },
        intro: 'Трансформация — жүйені енгізу емес, компанияның сатып алу туралы шешім қабылдау тәсілін өзгерту. Біз мақсатты модельді, саясаттар мен регламенттерді жобалап, оны қолдайтын технологияларды таңдауға көмектесеміз.',
        offerings: { title: 'Не кіреді', items: [
          { title: 'Жетілу деңгейін бағалау', text: 'Үздік практикалармен және сала бенчмарктарымен салыстыру.' },
          { title: 'Мақсатты операциялық модель', text: 'Құрылым, рөлдер, өкілеттіктер және бизнеспен, қаржымен өзара іс-қимыл.' },
          { title: 'Саясаттар мен регламенттер', text: 'Сатып алу саясаты, өкілеттіктер матрицасы, рәсімдер мен үлгілер.' },
          { title: 'Сандық құралдар', text: 'E-sourcing, P2P және шығындар аналитикасын таңдау және енгізу.' },
        ] },
        outcomes: { title: 'Әдеттегі нәтижелер', items: [{ label: 'сатып алу циклі' }, { label: 'функция басқаратын шығындар' }, { label: 'шығындар туралы деректер көзі' }] },
        process: { title: 'Жұмыс кезеңдері', items: [
          { title: 'Бағалау', text: 'Жетілу деңгейі мен басымдықтардың диагностикасы.' },
          { title: 'Жобалау', text: 'Мақсатты модель және жол картасы.' },
          { title: 'Енгізу', text: 'Саясаттар, процестер, жүйелер және оқыту.' },
          { title: 'Сүйемелдеу', text: 'KPI бақылау және түзетулер.' },
        ] },
        clients: { title: 'Бағыттың клиенттері' },
        faq: { title: 'Жиі қойылатын сұрақтар', items: [{ q: 'Трансформация қанша уақытқа созылады?', a: 'Көлеміне байланысты әдетте 6–18 ай. Алғашқы нәтижелер 2–3 айдан кейін-ақ көрінеді.' }] },
        cta: ctaKk,
      },
      'hero:Центральная Азия': { subtitle: 'Қазақстан мен Орталық Азия компанияларымен жұмыс істейміз: жергілікті жеткізушілер нарығы мен сатып алу практикасын білеміз.' },
      'article:priznaki-nuzhna-strategiya-zakupok': {
        title: 'Сатып алуға тағы бір тендер емес, стратегия қажет екенін көрсететін бес белгі', author: 'Айжан Сейтқали', category: 'Стратегия',
        excerpt: 'Тұрақты тендерлер үнем береді, бірақ жүйелі мәселелерді шешпейді. Санаттық басқаруға көшу уақыты келгенін көрсететін белгілерді талдаймыз.',
        body: '## Неге тендер жеткіліксіз\n\nТендер «бүгін кімнен арзан сатып алуға болады» деген сұраққа жауап береді. Стратегия «алдағы 2–3 жылда не, қанша, қалай және кімнен сатып алу керек» деген сұрақтарға жауап береді.\n\n## Бес белгі\n\n1. Тендерлерден түсетін **үнем жылдан жылға азаяды**.\n2. Бір санатты **әртүрлі бөлімшелер** әртүрлі жеткізушілерден сатып алады.\n3. **Шығындардың бірыңғай көрінісі жоқ** — деректерді қолмен жинауға тура келеді.\n4. **Жеткізушілердегі іркіліс** күтпеген жағдайға айналады.\n5. Бизнес сатып алуды серіктес емес, **бюрократиялық кезең** ретінде қабылдайды.\n\n## Неден бастау керек\n\n12–24 айдағы шығындарды талдаудан бастап, ең үлкен әлеуеті бар 3–5 санатты бөліп алыңыз. Алғашқы бизнес-кейс үшін осы жеткілікті.\n\n> Тұрақты нәтиже әр санаттың иесі, стратегиясы және KPI-ы бар жерде пайда болады.',
      },
      'article:otsenka-riskov-tsepochki-postavok': {
        title: 'Жеткізу тізбегінің тәуекелдерін төрт аптада қалай бағалауға болады', author: 'Айжан Сейтқали', category: 'Тәуекелдер',
        excerpt: 'Жылдам бағалаудың практикалық тәсілі: қандай деректер жинау керек, жеткізушілерді қалай сегменттеу және нәтижелермен не істеу.',
        body: '## 1-апта. Деректер\n\nЖеткізушілер тізімін жылдық көлемдермен, санаттармен және өндіріс немесе сату үшін сыни маңыздылығымен жинаңыз.\n\n## 2-апта. Сегменттеу\n\n| Сегмент | Өлшем | Тәсіл |\n|---|---|---|\n| Стратегиялық | Жоғары көлем және жоғары тәуекел | Бірлескен даму |\n| Тар жерлер | Шағын көлем, жоғары тәуекел | Баламалар мен қорлар |\n| Тетікті | Үлкен көлем, төмен тәуекел | Бәсекелі сатып алу |\n| Үйреншікті | Шағын көлем, төмен тәуекел | Автоматтандыру |\n\n## 3–4-апталар. Бағалау және жоспар\n\nСтратегиялық жеткізушілер мен тар жерлер үшін қаржылық тұрақтылықты, географияны және баламалардың болуын бағалаңыз. Нәтиже — тәуекелдер картасы және әрекеттер жоспары.',
      },
      'article:zakupochnaya-politika-chto-dolzhno-byt': {
        title: 'Сатып алу саясатында не болуы керек', author: 'Айжан Сейтқали', category: 'Трансформация',
        excerpt: 'Жақсы саясат қысқа, бизнеске түсінікті және әр ұсақ-түйекті сипаттамай, ереже белгілейді. Бөлімдер чек-парағы.',
        body: '## Саясат не үшін қажет\n\nСаясат қағидаттар мен өкілеттіктерді белгілейді. Рәсімдердің егжей-тегжейі регламенттерде.\n\n## Міндетті бөлімдер\n\n- Мақсаттар және қолдану аясы\n- Рөлдер және өкілеттіктер матрицасы\n- Шектер және сатып алу тәсілдері\n- Жеткізушілерге қойылатын талаптар және контрагенттерді тексеру\n- Этика және мүдделер қақтығысы\n- Тұрақтылық және ESG\n- Бақылау және есептілік\n\nСаясат үлгісін «Жүктеуге арналған материалдар» бөлімінен жүктеп алыңыз.',
      },
      'case:upakovka-fmcg': {
        title: 'FMCG өндірушісі үшін қаптама шығындарын азайту', tagline: 'Негізгі жеткізушілерді ауыстырмай 12% үнем', industry: 'FMCG',
        summary: 'Азық-түлік өндірушісі қаптаманы 14 жеткізушіден әртүрлі ерекшеліктер бойынша сатып алатын, бағалар үш жыл қайта қаралмаған.',
        result: 'Шығындарды талдау мен ерекшеліктерді стандарттауды жүргіздік, қаптама SKU санын 30%-ға қысқарттық және екі кезеңді тендер өткіздік. Шикізат бағасының формуласы бар жаңа шарттар нарықтық секірістерден қорғайды.',
        metrics: [{ label: 'санат бойынша үнем' }, { label: 'қаптама SKU' }, { label: 'жоба ұзақтығы' }],
      },
      'case:srm-logistika': {
        title: 'Логистикалық компания үшін жеткізушілерді басқару жүйесі', tagline: 'Жеткізу тізбегінің тәуекелдері бақылауда', industry: 'Логистика',
        summary: 'Тасымалдаушылардағы бірқатар іркілістен кейін компанияға ерте ескерту жүйесі мен резервтік көздер қажет болды.',
        result: '120 жеткізушіні сегменттеу мен скорингті, тоқсан сайынғы бизнес-шолуларды және сыни бағыттар үшін үздіксіздік жоспарларын енгіздік.',
        metrics: [{ label: 'мониторингтегі жеткізуші' }, { label: 'мерзімдердің бұзылуы' }],
      },
      'page:privacy': { title: 'Құпиялылық және cookie қолдану саясаты', body: PRIVACY_KK },
    },
  },

  en: {
    docs: {
      settings: {
        tagline: 'Strategic procurement consulting',
        contacts: { address: '1 Primernyi Ave, office 100, Almaty', hours: 'Mon–Fri, 9:00–18:00' },
        nav: [{ label: 'Home' }, { label: 'About' }, { label: 'Services' }, { label: 'Insights' }, { label: 'Projects' }, { label: 'Contact' }],
        headerCta: { label: 'Discuss your task' },
        footer: {
          about: 'An independent consulting firm. We help companies build procurement that lowers total cost of ownership and manages supply-chain risk.',
          copyright: '© {year} Meridian. All rights reserved.',
          links: [{ label: 'Privacy policy' }],
        },
        analytics: {
          bannerText: 'We use cookies to analyse traffic (Google Analytics). Analytics is switched on only with your consent.',
          acceptLabel: 'Accept', declineLabel: 'Decline', policyLabel: 'Learn more', settingsLabel: 'Cookie settings',
        },
        seo: { titleSuffix: ' — Meridian', description: 'Strategic procurement consulting: category management, supplier and risk management, procurement transformation.' },
        ui: {
          readMore: 'Read more', allArticles: 'All articles', backToInsights: '← All articles', backToCases: '← All projects',
          servicesMenu: 'Specialisations', contactsMenu: 'Contact', menuLabel: 'Menu', notFoundTitle: 'Page not found',
          notFoundText: 'The address may have changed. Start from the home page or see our specialisations.',
          homeLabel: 'Home', downloadLabel: 'Download', minRead: '{n} min read',
          skipLabel: 'Skip to content', crumbsLabel: 'Breadcrumb navigation', mainMenuLabel: 'Main menu', cookieLabel: 'Cookie notice',
          phoneLabel: 'Phone', emailLabel: 'E-mail', addressLabel: 'Address', hoursLabel: 'Opening hours', mapLabel: 'On the map',
          profileLabel: 'Profile', topicsLabel: 'Topics', clientsLabel: 'Clients', otherServices: 'Other specialisations',
        },
      },
      'page:home': {
        hero: {
          eyebrow: 'Strategic procurement consulting', title: 'Procurement that works for your bottom line',
          subtitle: 'We help executives turn procurement from a cost centre into a source of lasting savings, supply reliability and competitive advantage.',
          primary: { label: 'Discuss your task' }, secondary: { label: 'Our specialisations' },
        },
        trust: { title: 'Trusted by' },
        intro: {
          eyebrow: 'Our approach', title: 'Not a one-off saving, but a system that keeps working after we leave',
          body: "We don't sell quick wins. Every project starts with an analysis of spend and risk and ends with working processes, a trained team and a measurable result in the P&L.\n\nThe firm's partners personally lead every project, from diagnostics to making the result stick.",
        },
        stats: [{ label: 'years in procurement' }, { label: 'typical savings by category' }, { label: 'projects completed' }, { label: 'of clients come back' }],
        services: { eyebrow: 'Specialisations', title: 'Three areas where we have deep expertise', text: "We deliberately don't take on everything, only the tasks where we can guarantee the quality of the result.", linkLabel: 'Read more' },
        approach: {
          eyebrow: 'How we work', title: 'A transparent path from diagnostics to results',
          steps: [
            { title: 'Diagnostics', text: 'Analysis of spend, contracts and processes. A map of opportunities and risks in 3–4 weeks.' },
            { title: 'Strategy', text: 'Category strategies, a target procurement model and a business case agreed with leadership.' },
            { title: 'Implementation', text: 'Sourcing, negotiations, changes to processes and systems, together with your team.' },
            { title: 'Embedding', text: 'KPIs, training and handover of tools so the effect lasts for years.' },
          ],
        },
        insights: { eyebrow: 'Insights', title: 'Materials for heads of procurement', linkLabel: 'All articles' },
        testimonial: { quote: 'The team helped us not only cut costs in key categories but also build a process that our procurement department now runs on its own.', author: 'D. Yerzhanov', role: 'CFO, manufacturing company' },
        cta: ctaEn,
      },
      'page:about': {
        hero: { eyebrow: 'About', title: 'Independent procurement experts', subtitle: 'A small team of practitioners who ran procurement at large companies. We take responsibility for results as if the spend were our own.' },
        story: {
          title: 'History and mission',
          body: 'The firm was founded by practitioners who spent many years leading procurement in industry, retail and logistics. We saw optimisation projects deliver on paper and lose the effect a year later, so we built a methodology in which the durability of the result comes first.\n\n**Our mission** is to make procurement a strategic function trusted by the board, finance and the business.',
        },
        stats: [{ label: 'years in business' }, { label: 'industries' }, { label: 'countries' }],
        values: {
          title: 'Principles',
          items: [
            { title: 'Independence', text: 'We take no fees from suppliers. Recommendations are made only in the client\'s interest.' },
            { title: 'Measurability', text: 'Every effect is backed by data and agreed with the finance team.' },
            { title: 'Knowledge transfer', text: 'We work alongside your team and leave it with tools and skills.' },
            { title: 'Confidentiality', text: 'Client data is protected by agreements and internal policies.' },
          ],
        },
        team: {
          title: 'Team', text: 'The firm\'s partners take part in every project personally.',
          members: [
            { name: 'Assel Nurgaliyeva', role: 'Managing Partner', bio: 'Over 15 years in procurement; ran the function at an international manufacturing group.' },
            { name: 'Daniyar Kassymov', role: 'Partner, category management', bio: 'Expert in sourcing and negotiation in raw-material and indirect categories.' },
            { name: 'Irina Volkova', role: 'Partner, digital procurement', bio: 'Implemented e-sourcing systems and spend analytics in retail and logistics.' },
          ],
        },
        credentials: {
          title: 'Credentials',
          items: [
            { title: 'CIPS', text: 'Certified specialists of the Chartered Institute of Procurement & Supply.' },
            { title: 'ISO 20400', text: 'Experience implementing sustainable procurement practices.' },
            { title: 'Industry experience', text: 'Manufacturing, FMCG, retail, logistics, energy, real estate development.' },
          ],
        },
        cta: ctaEn,
      },
      'page:services': {
        hero: { eyebrow: 'Services', title: 'Specialisations', subtitle: 'Three areas where we add the most value. You can start with one and expand as results come in.' },
        intro: 'All projects are built around a measurable business effect: total cost of ownership, supply reliability, working capital and manageable risk.',
        why: {
          title: 'Why clients choose us',
          items: [
            { title: 'Practitioners, not theorists', text: 'Every consultant has led procurement in a real company.' },
            { title: 'Accountable for results', text: 'Fees can be tied to the confirmed effect.' },
            { title: 'Durability', text: 'We leave behind processes, KPIs and a trained team.' },
          ],
        },
        trust: { title: 'Working with us' },
        cta: ctaEn,
      },
      'page:insights': {
        hero: { eyebrow: 'Insights', title: 'Research and practical materials', subtitle: 'Observations from projects, market reviews and tools for heads of procurement and finance.' },
        allLabel: 'All topics', emptyText: 'New materials will appear here soon.',
        downloads: { title: 'Downloads', text: 'Reports, checklists and templates we share openly.' },
        cta: ctaEn,
      },
      'page:cases': {
        hero: { eyebrow: 'Projects', title: 'Project examples', subtitle: 'Selected projects. Client names are disclosed only with their consent.' },
        emptyText: 'Project examples will appear soon.', labels: { summary: 'Challenge', result: 'Result', metrics: 'Key figures' }, cta: ctaEn,
      },
      'page:contact': {
        hero: { eyebrow: 'Contact', title: 'Tell us about your task', subtitle: 'We reply within one business day. The first meeting carries no obligation.' },
        formTitle: 'Send a request', infoTitle: 'How to reach us',
        infoText: 'Prefer to write? E-mail us and we will send an NDA before discussing details.',
      },
      'form:contact': {
        fields: [
          { label: 'Name', placeholder: '' }, { label: 'Company', placeholder: '' }, { label: 'E-mail', placeholder: 'name@company.com' }, { label: 'Phone', placeholder: '' },
          { label: 'Topic', placeholder: 'Choose a topic', options: 'Strategy and category management\nSuppliers and risk\nProcurement transformation\nOther' },
          { label: 'Briefly about your task', placeholder: '' },
          { label: 'I agree to the processing of my personal data in accordance with the [privacy policy](/privacy)', placeholder: '' },
        ],
        submitLabel: 'Send', sendingLabel: 'Sending…', successTitle: 'Thank you! Your request has been sent', successText: 'We will get back to you within one business day.',
        errorText: 'Could not send your request. Please try again or e-mail us.', requiredText: 'Please fill in this field',
      },
    },
    entries: {
      'service:procurement-strategy': {
        title: 'Procurement strategy and category management',
        excerpt: 'Spend analysis, category strategies and sourcing that lower total cost of ownership by 8–15%.',
        hero: { eyebrow: 'Specialisation', subtitle: 'We turn scattered purchasing into a managed portfolio of categories with a clear strategy for each.' },
        intro: 'Most companies know **how much** they spend but not **why**. We start with spend transparency and build category strategies that take into account the supplier market, internal demand and risk.',
        offerings: { title: 'What is included', items: [
          { title: 'Spend analysis', text: 'Classification and cleansing of data; a spend map by category, supplier and business unit.' },
          { title: 'Category strategies', text: 'Segmentation, market analysis, savings levers and a roadmap for each category.' },
          { title: 'Strategic sourcing', text: 'Tenders, RFx, multi-round negotiations and supplier selection.' },
          { title: 'Demand management', text: 'Standardised specifications and a consumption policy, built with the business.' },
        ] },
        outcomes: { title: 'Typical results', items: [{ label: 'cost reduction in addressable categories' }, { label: 'to first confirmed effects' }, { label: 'spend transparency' }] },
        process: { title: 'Stages of work', items: [
          { title: 'Diagnostics', text: 'Data collection and analysis, interviews, an opportunity map.' },
          { title: 'Prioritisation', text: 'A business case by category and a plan of waves.' },
          { title: 'Sourcing', text: 'Running tenders and negotiations with suppliers.' },
          { title: 'Embedding', text: 'Contracts, KPIs, training of category managers.' },
        ] },
        clients: { title: 'Clients in this area' },
        faq: { title: 'Frequently asked questions', items: [
          { q: 'Which categories should we start with?', a: 'Those that combine large volume, a fragmented supplier base and terms that have not been revisited for a long time. This becomes clear right after diagnostics.' },
          { q: 'Can fees be tied to results?', a: 'Yes, we offer models with a fixed part and a fee based on confirmed savings.' },
        ] },
        cta: ctaEn,
      },
      'service:supplier-risk': {
        title: 'Supplier and risk management',
        excerpt: 'Supplier segmentation, supply-chain risk assessment and development programmes for key partners.',
        hero: { eyebrow: 'Specialisation', subtitle: 'We reduce dependence on single suppliers and make supply-chain risk visible and manageable.' },
        intro: 'A failure at one supplier can cost more than a year of savings from tenders. We build a supplier relationship management (SRM) system that joins performance, risk and joint development.',
        offerings: { title: 'What is included', items: [
          { title: 'Supplier segmentation', text: 'We identify strategic, key and transactional suppliers and the operating model for each.' },
          { title: 'Supply-chain risk assessment', text: 'Financial, operational, geographic and ESG risk; a map of critical dependencies.' },
          { title: 'Performance evaluation', text: 'Supplier KPIs and scorecards, regular business reviews.' },
          { title: 'Continuity plans', text: 'Alternative sources, safety stock and response scenarios.' },
        ] },
        outcomes: { title: 'Typical results', items: [{ label: 'share of critical single sources' }, { label: 'faster response to disruptions' }, { label: 'of key suppliers monitored' }] },
        process: { title: 'Stages of work', items: [
          { title: 'Inventory', text: 'Supplier base, volumes and criticality data.' },
          { title: 'Assessment', text: 'Risk and performance scoring.' },
          { title: 'SRM model', text: 'Roles, processes, KPIs and procedures.' },
          { title: 'Launch', text: 'A pilot with key suppliers and scale-up.' },
        ] },
        clients: { title: 'Clients in this area' },
        faq: { title: 'Frequently asked questions', items: [{ q: 'Do we need a dedicated system?', a: 'Not at the start. We begin with clear templates and processes and choose a system once the model works.' }] },
        cta: ctaEn,
      },
      'service:procurement-transformation': {
        title: 'Procurement transformation and digitalisation',
        excerpt: 'A target operating model, policies and procedures, selection and implementation of e-procurement and analytics systems.',
        hero: { eyebrow: 'Specialisation', subtitle: 'We build a procurement function that scales with the business: people, processes, policies and technology.' },
        intro: 'Transformation is not about installing a system; it changes how a company makes purchasing decisions. We design the target model, policies and procedures, and help choose the technology that will support them.',
        offerings: { title: 'What is included', items: [
          { title: 'Maturity assessment', text: 'Comparison with best practice and industry benchmarks.' },
          { title: 'Target operating model', text: 'Structure, roles, authority and interaction with the business and finance.' },
          { title: 'Policies and procedures', text: 'Procurement policy, approval matrix, procedures and templates.' },
          { title: 'Digital tools', text: 'Selection and implementation of e-sourcing, P2P and spend analytics.' },
        ] },
        outcomes: { title: 'Typical results', items: [{ label: 'purchase cycle time' }, { label: 'of spend under the function' }, { label: 'source of spend data' }] },
        process: { title: 'Stages of work', items: [
          { title: 'Assessment', text: 'Diagnostics of maturity and priorities.' },
          { title: 'Design', text: 'Target model and roadmap.' },
          { title: 'Implementation', text: 'Policies, processes, systems and training.' },
          { title: 'Support', text: 'KPI monitoring and adjustments.' },
        ] },
        clients: { title: 'Clients in this area' },
        faq: { title: 'Frequently asked questions', items: [{ q: 'How long does a transformation take?', a: 'Usually 6–18 months depending on scale. First results are visible within 2–3 months.' }] },
        cta: ctaEn,
      },
      'hero:Центральная Азия': { subtitle: 'We work with companies in Kazakhstan and Central Asia: we know the local supplier market and procurement practice.' },
      'article:priznaki-nuzhna-strategiya-zakupok': {
        title: 'Five signs your procurement needs a strategy, not another tender', author: 'Aizhan Seitkali', category: 'Strategy',
        excerpt: 'Regular tenders deliver savings but do not solve systemic problems. We look at the signals that it is time to move to category management.',
        body: '## Why tenders are not enough\n\nA tender answers the question "who is cheapest to buy from today". A strategy answers "what, how much, how and from whom to buy over the next 2–3 years".\n\n## Five signs\n\n1. **Savings from tenders shrink** year after year.\n2. **The same categories** are bought by different units from different suppliers.\n3. **There is no single view of spend**, so data has to be collected by hand.\n4. **Supplier failures** come as a surprise.\n5. **The business sees procurement** as a bureaucratic step rather than a partner.\n\n## Where to start\n\nStart with an analysis of 12–24 months of spend and pick 3–5 categories with the greatest potential. That is enough for a first business case.\n\n> Lasting effect appears where each category has an owner, a strategy and KPIs.',
      },
      'article:otsenka-riskov-tsepochki-postavok': {
        title: 'How to assess supply-chain risk in four weeks', author: 'Aizhan Seitkali', category: 'Risk',
        excerpt: 'A practical approach to a quick assessment: what data to collect, how to segment suppliers and what to do with the results.',
        body: '## Week 1. Data\n\nCollect a supplier list with annual volumes, categories and criticality for production or sales.\n\n## Week 2. Segmentation\n\n| Segment | Criterion | Approach |\n|---|---|---|\n| Strategic | High volume and high risk | Joint development |\n| Bottleneck | Low volume, high risk | Alternatives and stock |\n| Leverage | High volume, low risk | Competitive tendering |\n| Routine | Low volume, low risk | Automation |\n\n## Weeks 3–4. Assessment and plan\n\nFor strategic and bottleneck suppliers, assess financial stability, geography and availability of alternatives. The result is a risk map and an action plan.',
      },
      'article:zakupochnaya-politika-chto-dolzhno-byt': {
        title: 'What a procurement policy should contain', author: 'Aizhan Seitkali', category: 'Transformation',
        excerpt: 'A good policy is short, clear to the business and sets rules rather than describing every detail. A checklist of sections.',
        body: '## Why a policy\n\nA policy sets principles and authority. The details of procedures live in procedures.\n\n## Required sections\n\n- Objectives and scope\n- Roles and approval matrix\n- Thresholds and purchasing methods\n- Supplier requirements and counterparty checks\n- Ethics and conflicts of interest\n- Sustainability and ESG\n- Control and reporting\n\nDownload the policy template from the "Downloads" section.',
      },
      'case:upakovka-fmcg': {
        title: 'Cutting packaging costs for an FMCG manufacturer', tagline: '12% savings without changing key suppliers', industry: 'FMCG',
        summary: 'A food manufacturer bought packaging from 14 suppliers to inconsistent specifications, and prices had not been revisited for three years.',
        result: 'We ran a spend analysis and standardised specifications, cut packaging SKUs by 30% and held a two-stage tender. New contracts with a raw-material price formula protect against market spikes.',
        metrics: [{ label: 'savings in the category' }, { label: 'packaging SKUs' }, { label: 'project duration' }],
      },
      'case:srm-logistika': {
        title: 'A supplier management system for a logistics company', tagline: 'Supply-chain risk under control', industry: 'Logistics',
        summary: 'After a series of carrier failures, the company needed an early-warning system and backup sources.',
        result: 'We introduced segmentation and scoring of 120 suppliers, quarterly business reviews and continuity plans for critical routes.',
        metrics: [{ label: 'suppliers monitored' }, { label: 'missed deadlines' }],
      },
      'page:privacy': { title: 'Privacy and cookie policy', body: PRIVACY_EN },
    },
  },
};
