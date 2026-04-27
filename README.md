# Memoria — Интеллектуальный дневник с локальным AI

PWA-приложение для хранения текстовых воспоминаний с автотеггингом и суммаризацией на базе локальной LLM.

## 🚀 Быстрый старт

```bash
# Локальный сервер для разработки
node test-server.js
# Открыть http://localhost:8080
```

## ✨ Особенности

### Локальный AI
- **Автотеггинг** — AI анализирует текст и предлагает релевантные теги
- **Суммаризация** — краткие выжимки длинных записей
- **Приватность** — все вычисления в браузере, данные не покидают устройство
- **Graceful degradation** — отключается на слабом железе

### Технологии
- Vanilla JS + ES6 модули
- IndexedDB для локального хранения
- Web Workers для AI-инференса
- Transformers.js (Hugging Face) с квантизованными моделями
- TailwindCSS для UI
- Service Worker для PWA

## 📁 Структура проекта

```
memoria/
├── index.html          # Главная страница с onboarding
├── manifest.json       # PWA манифест
├── sw.js              # Service Worker
├── test-server.js     # Локальный сервер для тестов
├── css/
│   └── styles.css     # Кастомные стили
├── js/
│   ├── app.js         # Основное приложение
│   ├── db.js          # IndexedDB wrapper
│   ├── search.js      # Поиск с ранжированием
│   ├── tags.js        # Управление тегами
│   ├── ui.js          # UI компоненты
│   ├── ai-service.js  # Сервис управления AI
│   ├── ai-worker.js   # Web Worker для ML
│   └── onboarding.js  # Onboarding flow
└── docs/
    └── product-brainstorm.md  # Продуктовый анализ
```

## 🤖 AI Архитектура

```
Main Thread (UI)
    │
    ├── AIService (управление)
    │       │
    │       └── Web Worker (фоновый ML)
    │               │
    │               ├── Transformers.js
    │               │       └── DeBERTa v3 xsmall
    │               │           (zero-shot classification)
    │               │
    │               └── Summarizer (extractive)
    │
    └── IndexedDB (хранение)
```

### Процесс обработки

1. Пользователь сохраняет запись → UI отвечает мгновенно
2. AI-service проверяет поддержку устройства:
   - ≥ 2 CPU cores
   - ≥ 2GB RAM
   - ≥ 20% battery
3. Web Worker запускает inference:
   - Классификация тегов (batch processing)
   - Экстрактивная суммаризация
4. Результаты обновляют запись в IndexedDB
5. UI показывает уведомление

## 🎯 Требования к устройству

| Параметр | Минимум | Рекомендуется |
|----------|---------|---------------|
| CPU | 2 cores | 4+ cores |
| RAM | 2GB | 4GB+ |
| Storage | 100MB свободно | 500MB+ |
| Browser | Chrome 90+, Safari 14+ | Latest |

## 📱 PWA Установка

1. Откройте приложение в Chrome/Safari
2. Нажмите «Поделиться» → «На экран Домой» (iOS) или «Установить» (Android/Desktop)
3. Приложение работает оффлайн

## 🛠 Разработка

### Локальный запуск

```bash
cd /home/user/.openclaw/workspace/projects/memoria
node test-server.js
```

Сервер запускается на `http://localhost:8080` с CORS и заголовками для COOP/COEP.

### Отладка

- `Onboarding.reset()` — сбросить onboarding
- `AIService.toggle(false)` — отключить AI
- `App.memories` — данные в памяти
- `DB.getAll()` — данные в IndexedDB

### AI-дебаг

```javascript
// Проверка поддержки
await AIService.checkDeviceSupport()

// Ручной запуск обработки
await AIService.processMemory(App.memories[0])
```

## 📋 TODO / Фаза 2

- [ ] Суммаризация через seq2seq модель (DistilBART)
- [ ] Push Notifications для retention
- [ ] Экспорт в PDF/Markdown
- [ ] Пейволл после 50 записей
- [ ] Лендинг страница
- [ ] Product Hunt запуск

## 📝 Бизнес-модель

| Уровень | Цена | Фичи |
|---------|------|------|
| Free | $0 | 50 записей, базовый поиск |
| Pro (lifetime) | $29 | Безлимит, локальный AI, экспорт |
| Cloud | $4.99/мес | Синхронизация, облачный AI E2E |

## 🔒 Безопасность

- Нет серверной инфраструктуры
- Все данные в IndexedDB (локально)
- AI модели загружаются с CDN (JSDelivr) и кэшируются
- Нет telemetry/analytics по умолчанию

## 📄 Лицензия

MIT

---

Built with ❤️ by Fargo & Адам
