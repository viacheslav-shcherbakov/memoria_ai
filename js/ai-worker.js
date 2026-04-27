// ai-worker.js — Умный локальный AI для Memoria
// Чистый JS: TextRank, TF-IDF, ко-оккуренция, сентимент-анализ

let corpusStats = null;

// ===================== СЛОВАРИ =====================

const TAG_KEYWORDS = {
  'работа': ['работа', 'проект', 'задача', 'клиент', 'встреча', 'коллега', 'офис', 'дедлайн', 'звонок', 'письмо', 'отчёт', 'презентация', 'труд', 'рабочий', 'созвон', 'планерка', 'KPI', 'метрика'],
  'карьера': ['карьера', 'повышение', 'продвижение', 'рост', 'должность', 'начальник', 'руководитель', 'менеджер', 'CEO', 'директор', 'резюме', 'собеседование', 'найм', 'HR'],
  'стартап': ['стартап', 'запуск', 'MVP', 'продукт', 'приложение', 'разработка', 'код', 'программирование', 'фича', 'баг', 'релиз', 'деплой', 'пользователь', 'метрики', 'инвестор', 'питч', 'акселератор'],
  'семья': ['семья', 'родители', 'мама', 'папа', 'бабушка', 'дедушка', 'родственники', 'дома', 'семейный', 'близкие'],
  'дети': ['ребёнок', 'дети', 'сын', 'дочь', 'дочка', 'малыш', 'школа', 'детсад', 'родительское собрание', 'подросток', 'воспитание'],
  'дом': ['дом', 'квартира', 'ремонт', 'кухня', 'спальня', 'мебель', 'уборка', 'готовка', 'обед', 'ужин', 'быт', 'уют'],
  'здоровье': ['здоровье', 'врач', 'больница', 'анализ', 'болезнь', 'чувствую', 'симптом', 'лекарство', 'таблетка', 'терапевт', 'осмотр', 'вакцина'],
  'спорт': ['спорт', 'тренировка', 'бег', 'фитнес', 'зал', 'упражнение', 'километр', 'км', 'шаги', 'шагов', 'йога', 'плавание', 'велосипед', 'велопрогулка'],
  'еда': ['еда', 'ресторан', 'кафе', 'обед', 'ужин', 'завтрак', 'вкусно', 'готовил', 'готовила', 'рецепт', 'кухня', 'диета', 'питание'],
  'сон': ['сон', 'спал', 'спала', 'insomnia', 'бессонница', 'утро', 'проснулся', 'выспался', 'усталость', 'энергия', 'сонливость'],
  'путешествие': ['поездка', 'путешествие', 'отпуск', 'отдых', 'море', 'горы', 'город', 'природа', 'туризм', 'виза', 'отель', 'авиабилет'],
  'учёба': ['учёба', 'учиться', 'учился', 'училась', 'экзамен', 'зачёт', 'университет', 'школа', 'курс', 'лекция', 'диплом', 'наука', 'статья', 'исследование'],
  'книги': ['книга', 'читал', 'читала', 'автор', 'роман', 'фантастика', 'детектив', 'библиотека', 'жанр', 'сюжет', 'главный герой'],
  'отношения': ['отношения', 'парень', 'девушка', 'муж', 'жена', 'свадьба', 'развод', 'любовь', 'романтика', 'свидание', 'партнёр', 'бывший'],
  'друзья': ['друг', 'подруга', 'друзья', 'встреча', 'вечеринка', 'гуляли', 'общались', 'разговор', 'компания', 'посиделки', 'тусовка'],
  'мечты': ['мечта', 'хочу', 'желание', 'цель', 'план', 'будущее', 'когда-нибудь', 'когда-то', 'мечтать', 'желать'],
  'цели': ['цель', 'план', 'намерение', 'достиг', 'достигла', 'результат', 'успех', 'выполнил', 'выполнила', 'OKR', 'задача'],
  'тревога': ['тревога', 'боюсь', 'страх', 'worried', 'напряжение', 'нервы', 'stress', 'плохо', 'тяжело', 'тревожность', 'паника', 'беспокойство'],
  'радость': ['радость', 'счастье', 'happy', 'отлично', 'супер', 'круто', 'прекрасно', 'замечательно', 'ура', 'восторг', 'вдохновение'],
  'грусть': ['грусть', 'печаль', 'sad', 'расстроен', 'плохо', 'слёзы', 'плакал', 'плакала', 'тоска', 'разочарование', 'депрессия'],
  'благодарность': ['благодарен', 'благодарна', 'спасибо', 'ценю', 'признательность', 'везение', 'удача', 'фортуна', 'подарок'],
  'финансы': ['деньги', 'зарплата', 'доход', 'расход', 'бюджет', 'коплю', 'траты', 'экономия', 'инвестиции', 'акции', 'крипта', 'криптовалюта', 'пассивный доход'],
  'творчество': ['творчество', 'писать', 'рисовать', 'музыка', 'песня', 'стихи', 'арт', 'креатив', 'вдохновение', 'хобби', 'handmade'],
  'развитие': ['развитие', 'саморазвитие', 'учусь', 'навык', 'прогресс', 'рост', 'лучше', 'сильнее', 'коучинг', 'ментор', 'менторство'],
  'природа': ['природа', 'лес', 'парк', 'сад', 'растения', 'цветы', 'деревья', 'погода', 'солнце', 'дождь', 'озеро', 'река', 'прогулка'],
  'технологии': ['технология', 'гаджет', 'телефон', 'компьютер', 'Apple', 'iPhone', 'Android', 'app', 'AI', 'ChatGPT', 'нейросеть', 'GPT', 'модель'],
  'машина': ['машина', 'авто', 'ремонт авто', 'бензин', 'поездка', 'водить', 'водитель', 'пробки', 'автомобиль', 'ТО', 'страховка'],
  'покупки': ['купил', 'купила', 'покупка', 'магазин', 'заказ', 'доставка', 'новая вещь', 'одежда', 'Wildberries', 'Ozon', 'маркетплейс', 'распродажа']
};

const STOP_WORDS = new Set([
  'и', 'в', 'не', 'на', 'я', 'быть', 'он', 'с', 'что', 'а', 'по', 'это', 'она', 'этот', 'к', 'но', 'они', 'мы', 'как',
  'из', 'у', 'то', 'за', 'свой', 'для', 'весь', 'вы', 'все', 'так', 'его', 'о', 'её', 'который', 'тот', 'когда',
  'ещё', 'такой', 'только', 'бы', 'уже', 'или', 'ей', 'может', 'один', 'другой', 'сегодня', 'вчера', 'завтра',
  'the', 'is', 'and', 'a', 'to', 'of', 'in', 'that', 'it', 'with', 'for', 'was', 'are', 'as', 'this', 'have',
  'был', 'была', 'были', 'было', 'есть', 'нет', 'да', 'ну', 'вот', 'потом', 'здесь', 'там', 'где', 'тоже',
  'очень', 'много', 'мало', 'более', 'менее', 'теперь', 'ещё', 'даже', 'ведь', 'вроде', 'какой-то', 'какая-то',
  'просто', 'вообще', 'типа', 'типо', 'короче', 'ну', 'же', 'бы', 'ли', 'всё', 'ничего', 'никто'
]);

// Сентимент-словарь (русский)
const SENTIMENT = {
  positive: new Set([
    'рад', 'счастлив', 'счастлива', 'отлично', 'супер', 'круто', 'прекрасно', 'замечательно', 'ура', 'восторг',
    'вдохновение', 'люблю', 'обожаю', 'нравится', 'понравилось', 'удовольствие', 'удовлетворение', 'горжусь',
    'успех', 'достиг', 'достигла', 'выполнил', 'справился', 'победа', 'прорыв', 'рост', 'улучшение', 'лучше',
    'сильнее', 'уверенность', 'спокойствие', 'гармония', 'благодарность', 'благодарен', 'ценю', 'счастье',
    'радость', 'веселье', 'смех', 'шутка', 'юмор', 'позитив', 'энергия', 'силы', 'бодрость', 'optimistic',
    'happy', 'great', 'awesome', 'amazing', 'love', 'perfect', 'best', 'win', 'success', 'excited',
    'вдохновлён', 'мотивирован', 'горд', 'удивительно', 'фантастика', 'класс', 'огонь', 'топ'
  ]),
  negative: new Set([
    'грустно', 'печально', 'sad', 'расстроен', 'плохо', 'слёзы', 'плакал', 'плакала', 'тоска', 'разочарование',
    'депрессия', 'боль', 'страдание', 'мука', 'тревога', 'боюсь', 'страх', 'напряжение', 'нервы', 'stress',
    'тяжело', 'трудно', 'сложно', 'неполучается', 'провал', 'неудача', 'ошибка', 'проблема', 'блокер',
    'застрял', 'безвыходность', 'отчаяние', 'злость', 'гнев', 'раздражение', 'ненавижу', 'жалость',
    'усталость', 'выгорание', 'апатия', 'бессилие', 'frustrated', 'angry', 'hate', 'worst', 'fail',
    'disappointed', 'anxious', 'depressed', 'terrible', 'awful', 'horrible', 'pain', 'кошмар', 'ужас',
    'обидно', 'обида', 'жалко', 'стыд', 'вина', 'сожаление'
  ]),
  breakthrough: new Set([
    'прорыв', 'прорвался', 'прорвалась', 'понял', 'осознал', 'инсайт', 'открытие', 'революция', 'breakthrough',
    'прорывной', 'прорывное', 'прорывная', 'эврика', 'квантовый скачок', 'переломный', 'прорыв вперёд',
    'прорывной момент', 'ключевой момент', 'перелом', 'прорывная идея', 'гениально', 'гениальная идея'
  ]),
  blocker: new Set([
    'блокер', 'застрял', 'застряла', 'тупик', 'безвыходность', 'не могу', 'не получается', 'невозможно',
    'препятствие', 'преграда', 'стена', 'барьер', 'ограничение', 'завис', 'зависла', 'стоп', 'остановка',
    'затык', 'проблема', 'сложность', 'непонятно', 'не знаю', 'растерянность', 'потерялся', 'заблудился'
  ]),
  solved: new Set([
    'решил', 'решила', 'решено', 'решение', 'исправил', 'починил', 'наладил', 'устранил', 'закрыл', 'закрыла',
    'завершил', 'завершено', 'сделано', 'готово', 'fixed', 'resolved', 'done', 'complete', 'solved',
    'разобрался', 'разобралась', 'справился', 'справилась', 'преодолел', 'преодолела'
  ])
};

// ===================== УТИЛИТЫ NLP =====================

function tokenizeWords(text) {
  return text.toLowerCase()
    .replace(/[ё]/g, 'е')
    .replace(/[^а-яa-z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function getSentences(text) {
  return text
    .replace(/([.!?])\s+/g, "$1\n")
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 10);
}

function sentenceWords(sentence) {
  return tokenizeWords(sentence);
}

// Простая стемминг-функция (отрезание окончаний)
function stem(word) {
  const suffixes = ['овка', 'евка', 'ивка', 'ation', 'tion', 'ness', 'ment', 'ing', 'ed', 'ly',
    'ать', 'ять', 'еть', 'уть', 'ыть', 'ить', 'ись', 'ась', 'ясь',
    'ешь', 'ете', 'ешь', 'ют', 'ут', 'ют', 'ат', 'ят', 'им', 'ите',
    'овал', 'овала', 'овали', 'ование', 'ования',
    'ила', 'или', 'ило', 'ить', 'ишь', 'ить',
    'ать', 'яться', 'аться', 'иться',
    'енный', 'енная', 'енное', 'енные',
    'ский', 'ская', 'ское', 'ские',
    'ость', 'остей', 'остям', 'остях',
    'ения', 'ением', 'ении', 'ение',
    'ания', 'анием', 'ании', 'ание',
    'ирова', 'ировал', 'ирование',
    'изм', 'ист', 'изма', 'иста',
    'ация', 'ации', 'аций', 'ацию',
    'ик', 'ика', 'ики', 'иков',
    'ец', 'ца', 'цы', 'цов',
    'ик', 'ек', 'ок', 'к',
    'ом', 'ем', 'ам', 'ям',
    'ах', 'ях', 'ов', 'ев', 'ей',
    'и', 'ы', 'у', 'ю', 'е', 'о', 'а', 'я'];

  for (const suffix of suffixes) {
    if (word.endsWith(suffix) && word.length - suffix.length > 3) {
      return word.slice(0, -suffix.length);
    }
  }
  return word;
}

function wordOverlap(sent1, sent2) {
  const w1 = new Set(sentenceWords(sent1));
  const w2 = new Set(sentenceWords(sent2));
  let common = 0;
  for (const w of w1) {
    if (w2.has(w) || w2.has(stem(w)) || Array.from(w2).some(w2w => stem(w2w) === stem(w))) {
      common++;
    }
  }
  return common / (Math.log(w1.size + 1) + Math.log(w2.size + 1) + 1);
}

// ===================== TEXTRANK =====================

function textrank(text, maxSentences = 2, maxLength = 120) {
  const sentences = getSentences(text);
  if (sentences.length <= 1) {
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  }
  if (sentences.length <= maxSentences) {
    return sentences.join(' ').slice(0, maxLength) + (text.length > maxLength ? '...' : '');
  }

  // Строим матрицу схожести
  const n = sentences.length;
  const simMatrix = Array(n).fill(null).map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        simMatrix[i][j] = wordOverlap(sentences[i], sentences[j]);
      }
    }
  }

  // PageRank
  const damping = 0.85;
  const eps = 0.0001;
  let scores = Array(n).fill(1 / n);
  let prevScores;
  let iterations = 0;

  do {
    prevScores = [...scores];
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) {
        if (i !== j && simMatrix[j][i] > 0) {
          const outSum = simMatrix[j].reduce((a, b) => a + b, 0);
          sum += (simMatrix[j][i] / outSum) * prevScores[j];
        }
      }
      scores[i] = (1 - damping) / n + damping * sum;
    }
    iterations++;
  } while (iterations < 100 && scores.some((s, i) => Math.abs(s - prevScores[i]) > eps));

  // Сортируем по оригинальному порядку для связности
  const ranked = sentences
    .map((s, i) => ({ sentence: s, score: scores[i], index: i }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .sort((a, b) => a.index - b.index);

  let summary = ranked.map(r => r.sentence).join(' ');
  if (summary.length > maxLength) {
    summary = summary.slice(0, maxLength);
    const lastSpace = summary.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.7) summary = summary.slice(0, lastSpace);
    summary += '...';
  }

  return summary;
}

// ===================== TF-IDF ТЕГГИНГ =====================

function computeTfIdf(docWords, corpusDocs) {
  const tf = {};
  const total = docWords.length;
  docWords.forEach(w => { tf[w] = (tf[w] || 0) + 1; });

  const idf = {};
  const uniqueWords = Object.keys(tf);
  uniqueWords.forEach(word => {
    const docsWithWord = corpusDocs.filter(doc => doc.includes(word) || doc.includes(stem(word))).length;
    idf[word] = Math.log((corpusDocs.length + 1) / (docsWithWord + 1)) + 1;
  });

  const tfidf = {};
  uniqueWords.forEach(word => {
    tfidf[word] = (tf[word] / total) * idf[word];
  });

  return tfidf;
}

function extractTags(text, maxTags = 5, corpusDocs = []) {
  if (!text || text.length < 10) return [];

  const normalizedText = text.toLowerCase();
  const words = tokenizeWords(text);
  if (words.length === 0) return [];

  // 1. Словарный подход с улучшенным скорингом
  const tagScores = {};
  for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
    let score = 0;
    let matches = 0;
    for (const keyword of keywords) {
      const kw = keyword.toLowerCase();
      // Точное совпадение
      if (normalizedText.includes(kw)) {
        score += 3;
        matches++;
      }
      // Стемминг
      else if (words.some(w => stem(w) === stem(kw))) {
        score += 1.5;
        matches++;
      }
      // Частичное совпадение (для длинных слов)
      else if (kw.length > 5 && words.some(w => w.includes(kw.slice(0, 4)) || kw.includes(w))) {
        score += 0.5;
      }
    }
    if (matches > 0) {
      tagScores[tag] = score + Math.log(matches + 1);
    }
  }

  // 2. TF-IDF извлечение (если есть корпус)
  let tfidfTags = [];
  if (corpusDocs.length > 2) {
    const tfidf = computeTfIdf(words, corpusDocs);
    const topWords = Object.entries(tfidf)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([w]) => w);

    // Маппим top TF-IDF слова на теги
    for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
      if (tagScores[tag]) continue; // Уже есть
      const match = keywords.some(kw =>
        topWords.some(tw => tw === kw.toLowerCase() || stem(tw) === stem(kw))
      );
      if (match) {
        tagScores[tag] = 0.8;
      }
    }
  }

  // 3. Ко-оккуренция: если два тега часто встречаются вместе — усиливаем
  const cooccurrenceBoost = {
    'работа': ['карьера', 'проект', 'цели'],
    'стартап': ['работа', 'проект', 'цели', 'финансы'],
    'тревога': ['здоровье', 'сон', 'работа'],
    'радость': ['семья', 'друзья', 'путешествие'],
    'цели': ['мечты', 'развитие', 'работа'],
    'здоровье': ['спорт', 'сон', 'еда'],
    'учёба': ['книги', 'развитие', 'цели'],
    'отношения': ['семья', 'друзья', 'любовь'],
    'технологии': ['стартап', 'работа', 'проект']
  };

  const sortedTags = Object.entries(tagScores).sort((a, b) => b[1] - a[1]);
  const topTags = sortedTags.slice(0, maxTags + 2);

  topTags.forEach(([tag]) => {
    const coTags = cooccurrenceBoost[tag] || [];
    coTags.forEach(coTag => {
      if (tagScores[coTag] && tagScores[coTag] < tagScores[tag]) {
        tagScores[coTag] += 0.3;
      }
    });
  });

  // Финальная сортировка
  return Object.entries(tagScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxTags)
    .map(([tag]) => tag);
}

// ===================== СЕНТИМЕНТ / MOOD =====================

function analyzeSentiment(text) {
  const words = tokenizeWords(text);
  const stems = words.map(stem);
  const allForms = new Set([...words, ...stems]);

  let scores = {
    positive: 0,
    negative: 0,
    breakthrough: 0,
    blocker: 0,
    solved: 0
  };

  for (const word of allForms) {
    if (SENTIMENT.positive.has(word)) scores.positive += 1;
    if (SENTIMENT.negative.has(word)) scores.negative += 1;
    if (SENTIMENT.breakthrough.has(word)) scores.breakthrough += 2;
    if (SENTIMENT.blocker.has(word)) scores.blocker += 2;
    if (SENTIMENT.solved.has(word)) scores.solved += 2;
  }

  // Специальные паттерны
  const textLower = text.toLowerCase();
  if (/понял|осознал|прозрение|открыл|эврика/.test(textLower)) scores.breakthrough += 1.5;
  if (/не могу|не получается|застрял|тупик|безысход/.test(textLower)) scores.blocker += 1.5;
  if (/решил|исправил|починил|закрыл|готово/.test(textLower)) scores.solved += 1.5;

  // Определяем доминирующий mood
  const moodScores = [
    { mood: 'breakthrough', score: scores.breakthrough },
    { mood: 'solved', score: scores.solved },
    { mood: 'blocker', score: scores.blocker },
    { mood: 'research', score: textLower.includes('исслед') || textLower.includes('узнал') ? 0.5 : 0 },
    { mood: 'experiment', score: textLower.includes('попробовал') || textLower.includes('тест') ? 0.5 : 0 }
  ];

  // Проверяем эмоциональный окрас
  const netSentiment = scores.positive - scores.negative;

  moodScores.sort((a, b) => b.score - a.score);
  const topMood = moodScores[0];

  if (topMood.score >= 1) {
    return topMood.mood;
  }

  // Если нет специфического mood — по сентименту
  if (netSentiment > 1) return 'breakthrough';
  if (netSentiment < -1) return 'blocker';
  return 'routine';
}

// ===================== КЛЮЧЕВЫЕ СЛОВА =====================

function extractKeywords(text, maxKeywords = 5) {
  const words = tokenizeWords(text);
  if (words.length === 0) return [];

  const freq = {};
  words.forEach(w => {
    const s = stem(w);
    freq[s] = (freq[s] || 0) + 1;
  });

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word, count]) => ({ word, count }));
}

// ===================== КОРПУС =====================

function updateCorpus(texts) {
  corpusStats = texts.map(t => tokenizeWords(t));
}

// ===================== ОБРАБОТКА СООБЩЕНИЙ =====================

self.onmessage = function(e) {
  const { type, data, id } = e.data;

  try {
    switch (type) {
      case 'init':
        self.postMessage({ type: 'loading', progress: 30, message: 'Загрузка моделей...' });
        setTimeout(() => {
          self.postMessage({ type: 'loading', progress: 70, message: 'Инициализация NLP...' });
          setTimeout(() => {
            self.postMessage({ type: 'ready' });
          }, 150);
        }, 150);
        break;

      case 'extractTags':
        const tags = extractTags(data.text, data.maxTags, corpusStats || []);
        self.postMessage({ type: 'tags', id, data: tags });
        break;

      case 'summarize':
        const summary = textrank(data.text, 2, data.maxLength || 120);
        self.postMessage({ type: 'summary', id, data: summary });
        break;

      case 'analyzeSentiment':
        const mood = analyzeSentiment(data.text);
        self.postMessage({ type: 'sentiment', id, data: mood });
        break;

      case 'extractKeywords':
        const keywords = extractKeywords(data.text, data.maxKeywords);
        self.postMessage({ type: 'keywords', id, data: keywords });
        break;

      case 'updateCorpus':
        updateCorpus(data.texts);
        self.postMessage({ type: 'corpusUpdated', id, data: true });
        break;

      default:
        self.postMessage({ type: 'error', id, error: 'Unknown command: ' + type });
    }
  } catch (error) {
    console.error('AI Worker error:', error);
    self.postMessage({ type: 'error', id, error: error.message });
  }
};
