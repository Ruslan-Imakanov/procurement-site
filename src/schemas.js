// Описание всех типов контента в формате JSON Schema (+ подсказки для редактора: format, x-*).
// По этим схемам админка строит формы. Схему любого типа можно переопределить в админке
// («Разработчику → Схемы контента»): переопределение хранится в базе, код не меняется.

const str = (title, extra = {}) => ({ type: 'string', title, ...extra });
const text = (title, extra = {}) => str(title, { format: 'textarea', ...extra });
const md = (title, extra = {}) => str(title, { format: 'markdown', ...extra });
const num = (title, extra = {}) => ({ type: 'number', title, ...extra });
const bool = (title, extra = {}) => ({ type: 'boolean', title, ...extra });
const list = (title, items, extra = {}) => ({ type: 'array', title, items, ...extra });
const obj = (title, properties, extra = {}) => ({ type: 'object', title, properties, ...extra });
const img = (title, extra = {}) => obj(title, { id: str('Файл'), alt: str('Описание (alt)') }, { format: 'image', ...extra });
const btn = (title) => obj(title, { label: str('Текст кнопки'), href: str('Ссылка', { description: 'Например /contact или https://…' }) }, { 'x-inline': true });
const heroBlock = (title = 'Шапка страницы') => obj(title, { eyebrow: str('Надзаголовок'), title: str('Заголовок H1'), subtitle: text('Подзаголовок') });
const seo = obj('SEO и разметка schema.org', {
  title: str('Title (заголовок вкладки)', { description: 'До ~60 символов. Пусто — сформируется автоматически', maxLength: 120 }),
  description: text('Meta description', { description: 'До ~160 символов — текст под ссылкой в поиске', maxLength: 300 }),
  ogImage: img('Картинка для соцсетей', { description: 'Рекомендуется 1200×630' }),
  noindex: bool('Скрыть от поисковиков (noindex)'),
  jsonld: str('Дополнительная JSON-LD разметка', { format: 'json', description: 'Объект или массив schema.org. Базовая разметка (Organization, Service, Article, BreadcrumbList) добавляется автоматически' }),
}, { 'x-collapsed': true });
const steps = (title) => obj(title, { title: str('Заголовок блока'), items: list('Пункты', obj('Пункт', { title: str('Заголовок'), text: text('Текст') })) });
const ctaBlock = obj('Призыв к действию (внизу страницы)', { title: str('Заголовок'), text: text('Текст'), button: btn('Кнопка') });

const ICONS = ['strategy', 'suppliers', 'digital', 'chart', 'shield', 'globe', 'savings', 'team'];

export const SCHEMAS = {
  settings: obj('Настройки сайта', {
    siteName: str('Название компании'),
    tagline: str('Слоган (рядом с логотипом и в футере)'),
    logo: img('Логотип', { description: 'SVG или PNG с прозрачным фоном. Пусто — выводится название текстом' }),
    siteUrl: str('Основной адрес сайта', { description: 'Например https://example.com — для canonical, sitemap и разметки. Пусто — текущий адрес' }),
    contacts: obj('Контакты', {
      phone: str('Телефон'), email: str('E-mail'), address: text('Адрес'), hours: str('Часы работы'),
      mapUrl: str('Ссылка на карту'),
      social: list('Соцсети и мессенджеры', obj('Ссылка', { label: str('Название'), url: str('Адрес') }, { 'x-inline': true })),
    }),
    nav: list('Главное меню', obj('Пункт', { label: str('Текст'), href: str('Ссылка') }, { 'x-inline': true }), { description: 'Пункт /cases показывается, только когда включены «Примеры проектов»' }),
    headerCta: btn('Кнопка в шапке'),
    footer: obj('Подвал', {
      about: text('Текст о компании'),
      copyright: str('Копирайт', { description: '{year} заменится на текущий год' }),
      links: list('Ссылки в подвале', obj('Ссылка', { label: str('Текст'), href: str('Ссылка') }, { 'x-inline': true })),
    }),
    indexing: bool('Разрешить индексацию поисковиками', { description: 'Пока сайт наполняется (тексты-заглушки, временный адрес) — выключено: все страницы отдаются с noindex. Включите после запуска на основном домене' }),
    casesEnabled: bool('Показывать раздел «Примеры проектов»', { description: 'Пока выключено — раздел скрыт от посетителей и поисковиков, администраторы видят его через предпросмотр' }),
    analytics: obj('Google Analytics 4 и cookie', {
      ga4Id: str('Measurement ID GA4', { description: 'Вида G-XXXXXXXXXX. Пусто — аналитика не подключается' }),
      bannerEnabled: bool('Показывать уведомление о cookie'),
      bannerText: text('Текст уведомления'),
      acceptLabel: str('Кнопка «Принять»'),
      declineLabel: str('Кнопка «Отклонить»'),
      policyLabel: str('Текст ссылки на политику'),
      policyHref: str('Ссылка на политику'),
      settingsLabel: str('Ссылка «Настройки cookie» в подвале'),
    }),
    seo: obj('SEO по умолчанию', {
      titleSuffix: str('Окончание заголовков', { description: 'Например « — Меридиан». Добавляется к title страниц' }),
      description: text('Описание сайта по умолчанию'),
      ogImage: img('Картинка для соцсетей по умолчанию'),
      organizationJsonLd: str('JSON-LD организации (вместо автоматической)', { format: 'json' }),
      robotsExtra: text('Дополнительные строки robots.txt'),
    }, { 'x-collapsed': true }),
    notifications: obj('Уведомления о заявках', {
      email: str('E-mail для уведомлений', { description: 'Работает, если задан секрет RESEND_API_KEY' }),
      emailFrom: str('Отправитель писем', { description: 'Например «Сайт <site@ваш-домен>»; домен должен быть подтверждён в Resend' }),
      telegramChatId: str('Telegram chat id', { description: 'Работает, если задан секрет TELEGRAM_BOT_TOKEN' }),
      turnstileSiteKey: str('Cloudflare Turnstile site key (защита от спама)', { description: 'Нужен также секрет TURNSTILE_SECRET' }),
    }, { 'x-collapsed': true }),
    dms: obj('Документы (DMS): справочники и шаблоны имён', {
      types: list('Типы документов', obj('Тип', { code: str('Код'), name: str('Название') }, { 'x-inline': true })),
      departments: list('Направления', obj('Направление', { code: str('Код'), name: str('Название') }, { 'x-inline': true })),
      numberTemplate: str('Шаблон номера', { description: 'Поля: {type} {dept} {year} {seq} {seq:3} — номер с ведущими нулями' }),
      fileTemplate: str('Шаблон имени файла', { description: 'Поля: {number} {version} {title} {type} {dept} {date} {year}' }),
    }, { 'x-collapsed': true }),
    ui: obj('Подписи интерфейса', {
      readMore: str('«Подробнее»'), allArticles: str('«Все материалы»'), backToInsights: str('«← Ко всем материалам»'),
      backToCases: str('«← Ко всем проектам»'), servicesMenu: str('Заголовок блока услуг в подвале'),
      contactsMenu: str('Заголовок блока контактов в подвале'), menuLabel: str('Кнопка меню на телефоне'),
      notFoundTitle: str('Заголовок страницы 404'), notFoundText: text('Текст страницы 404'), homeLabel: str('Крошки: «Главная»'),
      downloadLabel: str('Кнопка «Скачать»'), minRead: str('Подпись времени чтения', { description: '{n} — минуты' }),
    }, { 'x-collapsed': true }),
  }),

  'page:home': obj('Главная страница', {
    hero: obj('Первый экран', {
      eyebrow: str('Надзаголовок'), title: str('Заголовок H1'), subtitle: text('Подзаголовок'),
      primary: btn('Основная кнопка'), secondary: btn('Вторая кнопка'),
    }, { description: 'Фоновое изображение зависит от страны посетителя — см. раздел «Баннеры по регионам». Заголовок можно переопределить для региона' }),
    trust: obj('Логотипы клиентов', { show: bool('Показывать'), title: str('Заголовок') }),
    intro: obj('О подходе', { eyebrow: str('Надзаголовок'), title: str('Заголовок'), body: md('Текст') }),
    stats: list('Цифры', obj('Показатель', { value: str('Значение'), label: str('Подпись') }, { 'x-inline': true })),
    services: obj('Блок услуг', { eyebrow: str('Надзаголовок'), title: str('Заголовок'), text: text('Текст'), linkLabel: str('Текст ссылки на карточке') }),
    approach: obj('Как мы работаем', { eyebrow: str('Надзаголовок'), title: str('Заголовок'), steps: list('Этапы', obj('Этап', { title: str('Заголовок'), text: text('Текст') })) }),
    insights: obj('Блок аналитики', { show: bool('Показывать'), eyebrow: str('Надзаголовок'), title: str('Заголовок'), linkLabel: str('Ссылка «Все материалы»'), count: num('Сколько статей показывать', { minimum: 1, maximum: 6 }) }),
    testimonial: obj('Отзыв', { show: bool('Показывать'), quote: text('Цитата'), author: str('Автор'), role: str('Должность, компания') }),
    cta: ctaBlock,
    seo,
  }),

  'page:about': obj('Страница «О нас»', {
    hero: heroBlock(),
    story: obj('История и миссия', { title: str('Заголовок'), body: md('Текст'), image: img('Изображение') }),
    stats: list('Цифры', obj('Показатель', { value: str('Значение'), label: str('Подпись') }, { 'x-inline': true })),
    values: steps('Принципы работы'),
    team: obj('Команда', {
      title: str('Заголовок'), text: text('Текст'),
      members: list('Сотрудники', obj('Сотрудник', { name: str('Имя'), role: str('Должность'), bio: text('Коротко об опыте'), photo: img('Фото (квадратное)'), linkedin: str('Ссылка на профиль') })),
    }),
    credentials: steps('Квалификация и сертификаты'),
    cta: ctaBlock,
    seo,
  }),

  'page:services': obj('Страница «Услуги»', {
    hero: heroBlock(),
    intro: md('Вступление'),
    why: steps('Почему выбирают нас'),
    trust: obj('Логотипы клиентов', { show: bool('Показывать'), title: str('Заголовок') }),
    cta: ctaBlock,
    seo,
  }),

  'page:insights': obj('Страница «Аналитика»', {
    hero: heroBlock(),
    allLabel: str('Фильтр «Все темы»'),
    emptyText: str('Текст, если статей нет'),
    downloads: obj('Материалы для скачивания', { show: bool('Показывать'), title: str('Заголовок'), text: text('Текст') }, { description: 'Сюда попадают документы из DMS с уровнем доступа «Публичный»' }),
    cta: ctaBlock,
    seo,
  }),

  'page:cases': obj('Страница «Примеры проектов»', {
    hero: heroBlock(),
    emptyText: str('Текст, если проектов нет'),
    labels: obj('Подписи', { summary: str('«Задача»'), result: str('«Результат»'), metrics: str('«Ключевые цифры»') }),
    cta: ctaBlock,
    seo,
  }),

  'page:contact': obj('Страница «Контакты»', {
    hero: heroBlock(),
    formTitle: str('Заголовок формы'),
    formText: text('Текст над формой'),
    infoTitle: str('Заголовок блока контактов'),
    infoText: md('Текст под контактами'),
    seo,
  }),

  'form:contact': obj('Форма обратной связи', {
    fields: list('Поля формы', obj('Поле', {
      name: str('Системное имя', { description: 'Латиницей, без пробелов: name, email, phone…', pattern: '^[a-z][a-z0-9_]*$' }),
      label: str('Подпись'),
      type: str('Тип', { enum: ['text', 'email', 'tel', 'textarea', 'select', 'checkbox'], 'x-enumTitles': ['Строка', 'E-mail', 'Телефон', 'Многострочный текст', 'Выпадающий список', 'Галочка (согласие)'] }),
      required: bool('Обязательное'),
      placeholder: str('Подсказка в поле'),
      options: text('Варианты списка', { description: 'Каждый с новой строки (для «Выпадающий список»)' }),
      width: str('Ширина', { enum: ['full', 'half'], 'x-enumTitles': ['Вся строка', 'Половина'] }),
    })),
    submitLabel: str('Текст кнопки отправки'),
    sendingLabel: str('Текст во время отправки'),
    successTitle: str('Заголовок после отправки'),
    successText: text('Текст после отправки'),
    errorText: str('Текст ошибки'),
    requiredText: str('Подсказка «обязательное поле»'),
  }),

  service: obj('Специализация', {
    title: str('Название'),
    slug: str('Адрес страницы', { format: 'slug', description: '/services/<адрес>' }),
    icon: str('Иконка', { enum: ICONS }),
    excerpt: text('Краткое описание для карточки'),
    hero: obj('Шапка', { eyebrow: str('Надзаголовок'), subtitle: text('Подзаголовок') }),
    image: img('Изображение'),
    intro: md('Описание'),
    offerings: steps('Что входит'),
    outcomes: obj('Результаты', { title: str('Заголовок'), items: list('Показатели', obj('Показатель', { value: str('Значение'), label: str('Подпись') }, { 'x-inline': true })) }),
    process: steps('Этапы работы'),
    clients: obj('Логотипы клиентов', { show: bool('Показывать'), title: str('Заголовок') }),
    faq: obj('Вопросы и ответы', { title: str('Заголовок'), items: list('Вопросы', obj('Вопрос', { q: str('Вопрос'), a: text('Ответ') })) }),
    cta: ctaBlock,
    seo,
  }),

  article: obj('Статья', {
    title: str('Заголовок'),
    slug: str('Адрес страницы', { format: 'slug', description: '/insights/<адрес>' }),
    date: str('Дата публикации', { format: 'date' }),
    author: str('Автор'),
    category: str('Рубрика'),
    excerpt: text('Анонс (для карточки и поисковиков)'),
    cover: img('Обложка'),
    body: md('Текст статьи'),
    seo,
  }),

  case: obj('Пример проекта', {
    title: str('Заголовок'),
    slug: str('Адрес страницы', { format: 'slug', description: '/cases/<адрес>' }),
    tagline: str('Слоган'),
    industry: str('Отрасль'),
    summary: text('Резюме (задача клиента)'),
    result: md('Результат'),
    metrics: list('Ключевые цифры', obj('Показатель', { value: str('Значение'), label: str('Подпись') }, { 'x-inline': true })),
    image: img('Изображение'),
    seo,
  }),

  client: obj('Логотип клиента', {
    name: str('Название компании'),
    logo: img('Логотип', { description: 'SVG или PNG на прозрачном фоне, лучше горизонтальный' }),
    url: str('Сайт (необязательно)'),
    showOnHome: bool('Показывать на главной и на странице услуг'),
    services: list('Показывать на страницах специализаций', str('Адрес специализации'), { format: 'services', description: 'Пусто — на всех' }),
  }),

  hero: obj('Баннер по региону', {
    name: str('Название (для себя)'),
    regions: str('Страны / регионы', { description: 'Коды стран через запятую (KZ, UZ, RU…) или континентов (EU, AS, NA, SA, AF, OC). * — для всех остальных' }),
    image: img('Фоновое изображение', { description: 'Широкое, от 1920 px. Текст поверх читается лучше на тёмных снимках' }),
    title: str('Заголовок для региона (необязательно)'),
    subtitle: text('Подзаголовок для региона (необязательно)'),
  }),

  page: obj('Дополнительная страница', {
    title: str('Заголовок'),
    slug: str('Адрес страницы', { format: 'slug', description: '/<адрес>, например privacy' }),
    body: md('Текст'),
    showInFooter: bool('Ссылка в подвале'),
    seo,
  }),
};

export { ICONS };
