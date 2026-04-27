// ai-service.js — Сервис управления AI в main thread

const AIService = {
  worker: null,
  isReady: false,
  isSupported: false,
  isEnabled: true,
  pendingRequests: new Map(),
  requestId: 0,

  onProgress: null,
  onReady: null,
  onError: null,

  async init() {
    const settings = await this.loadSettings();
    this.isEnabled = settings.aiEnabled !== false;

    if (!this.isEnabled) {
      console.log('AI отключен пользователем');
      return false;
    }

    const support = await this.checkDeviceSupport();
    if (!support.isSupported) {
      console.log('Устройство не поддерживает локальный AI:', support.checks);
      this.isSupported = false;
      return false;
    }

    this.isSupported = true;

    try {
      this.worker = new Worker('js/ai-worker.js');
      this.worker.onmessage = (e) => this.handleMessage(e.data);
      this.worker.onerror = (err) => {
        console.error('AI Worker error:', err);
        if (this.onError) this.onError(err.message);
      };

      this.worker.postMessage({ type: 'init' });
      return true;
    } catch (err) {
      console.error('Failed to create AI worker:', err);
      return false;
    }
  },

  handleMessage(data) {
    switch (data.type) {
      case 'loading':
        if (this.onProgress) this.onProgress(data.progress, data.message);
        break;
      case 'ready':
        this.isReady = true;
        if (this.onReady) this.onReady();
        break;
      case 'error':
        console.error('AI Error:', data.error);
        if (data.id && this.pendingRequests.has(data.id)) {
          const { reject } = this.pendingRequests.get(data.id);
          reject(new Error(data.error));
          this.pendingRequests.delete(data.id);
        }
        if (this.onError) this.onError(data.error);
        break;
      case 'tags':
      case 'summary':
      case 'sentiment':
      case 'keywords':
      case 'corpusUpdated':
      case 'support':
        if (data.id && this.pendingRequests.has(data.id)) {
          const { resolve } = this.pendingRequests.get(data.id);
          resolve(data.data);
          this.pendingRequests.delete(data.id);
        }
        break;
    }
  },

  sendRequest(type, data) {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const id = ++this.requestId;
      this.pendingRequests.set(id, { resolve, reject });

      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          reject(new Error('Request timeout'));
          this.pendingRequests.delete(id);
        }
      }, 30000);

      this.worker.postMessage({ type, data, id });
    });
  },

  async checkDeviceSupport() {
    const checks = {
      cores: navigator.hardwareConcurrency || 1,
      memory: navigator.deviceMemory || 4,
      storage: false,
      battery: true,
      online: navigator.onLine
    };

    if ('getBattery' in navigator) {
      try {
        const battery = await navigator.getBattery();
        checks.battery = battery.level > 0.15;
      } catch (e) {}
    }

    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        checks.storage = (estimate.quota || 0) > 300 * 1024 * 1024;
      } catch (e) {
        checks.storage = true;
      }
    }

    const isSupported = checks.cores >= 2 && checks.memory >= 2 && checks.battery;
    return { isSupported, checks };
  },

  async extractTags(text, maxTags = 5) {
    if (!this.isReady || !text || text.length < 10) return [];
    try {
      return await this.sendRequest('extractTags', { text, maxTags });
    } catch (err) {
      console.error('Tag extraction failed:', err);
      return [];
    }
  },

  async summarize(text, maxLength = 120) {
    if (!this.isReady || !text || text.length < 200) return null;
    try {
      return await this.sendRequest('summarize', { text, maxLength });
    } catch (err) {
      console.error('Summarization failed:', err);
      return null;
    }
  },

  async analyzeSentiment(text) {
    if (!this.isReady || !text || text.length < 15) return 'routine';
    try {
      return await this.sendRequest('analyzeSentiment', { text });
    } catch (err) {
      console.error('Sentiment analysis failed:', err);
      return 'routine';
    }
  },

  async extractKeywords(text, maxKeywords = 5) {
    if (!this.isReady || !text) return [];
    try {
      return await this.sendRequest('extractKeywords', { text, maxKeywords });
    } catch (err) {
      console.error('Keyword extraction failed:', err);
      return [];
    }
  },

  async updateCorpus(texts) {
    if (!this.isReady) return false;
    try {
      return await this.sendRequest('updateCorpus', { texts });
    } catch (err) {
      console.error('Corpus update failed:', err);
      return false;
    }
  },

  // Полная обработка записи
  async processMemory(memory, allMemories = []) {
    if (!this.isReady || !this.isEnabled) {
      return { tags: [], summary: null, mood: null };
    }

    // Обновляем корпус для TF-IDF
    if (allMemories.length > 2) {
      const corpus = allMemories.map(m => m.content).filter(Boolean);
      this.updateCorpus(corpus);
    }

    const [tags, summary, mood] = await Promise.all([
      this.extractTags(memory.content, 5),
      memory.content.length > 250 ? this.summarize(memory.content, 120) : Promise.resolve(null),
      this.analyzeSentiment(memory.content)
    ]);

    return { tags, summary, mood };
  },

  async loadSettings() {
    try {
      const stored = localStorage.getItem('memoria-ai-settings');
      return stored ? JSON.parse(stored) : { aiEnabled: true };
    } catch {
      return { aiEnabled: true };
    }
  },

  async saveSettings(settings) {
    localStorage.setItem('memoria-ai-settings', JSON.stringify(settings));
    this.isEnabled = settings.aiEnabled;
  },

  async toggle(enabled) {
    await this.saveSettings({ aiEnabled: enabled });
    if (enabled && !this.worker) {
      return await this.init();
    } else if (!enabled && this.worker) {
      this.terminate();
    }
    return true;
  },

  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isReady = false;
    }
  }
};

window.AIService = AIService;
