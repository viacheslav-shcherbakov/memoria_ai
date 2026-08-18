const App = {
    memories: [],
    currentMemory: null,
    currentQuery: '',
    currentProjectId: null,
    deferredPrompt: null,
    aiProcessing: false,
    projects: [],
    activeTab: 'memories',
    selectedMood: 'routine',
    selectedProjectId: null,

    async init() {
        await DB.init();
        await this.loadMemories();
        await this.loadProjects();

        this.initTheme();
        this.setupTabs();
        this.setupEventListeners();
        this.setupPWA();
        this.setupAI();
        this.setupAnalytics();
        this.setupProjectsTab();
        this.setupSettings();

        TagsManager.load(this.memories);
        this.currentProjectId = null; // По умолчанию показываем все записи
        this.filter();
        
        // Init swipe gestures after DOM is ready
        requestAnimationFrame(() => {
            if (window.SwipeGestures && document.getElementById('memories-list')) {
                SwipeGestures.init(document.getElementById('memories-list'));
            }
        });
    },

    async loadMemories() {
        this.memories = await DB.getAll();
    },

    async loadProjects() {
        this.projects = await ProjectService.getActiveProjects();
        this.renderProjectPills();
        this.renderProjectsTab();
        this.renderModalProjectPills();
    },

    // ==================== TAB NAVIGATION ====================
    setupTabs() {
        document.querySelectorAll('#bottom-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Hide FAB on non-memories tabs
        this.updateFABVisibility();
    },

    switchTab(tabName) {
        this.activeTab = tabName;

        // Update bottom tab bar
        document.querySelectorAll('#bottom-tabs .tab-btn').forEach(b => {
            b.classList.remove('active', 'text-primary');
            b.classList.add('text-stone-500');
            const icon = b.querySelector('.tab-icon');
            if (icon) icon.style.transform = '';
        });

        const activeBtn = document.querySelector(`#bottom-tabs .tab-btn[data-tab="${tabName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active', 'text-primary');
            activeBtn.classList.remove('text-stone-500');
            const icon = activeBtn.querySelector('.tab-icon');
            if (icon) icon.style.transform = 'scale(1.2)';
        }

        // Show/hide tab views
        document.querySelectorAll('.tab-view').forEach(v => v.classList.add('hidden'));
        const view = document.getElementById(`tab-${tabName}`);
        if (view) view.classList.remove('hidden');

        this.updateFABVisibility();

        // Refresh tab content
        if (tabName === 'analytics') this.renderAnalyticsTab();
        if (tabName === 'projects') this.renderProjectsTab();
        if (tabName === 'settings') this.refreshSettings();
    },

    updateFABVisibility() {
        const fab = document.getElementById('add-btn');
        if (!fab) return;
        fab.style.display = this.activeTab === 'memories' ? 'flex' : 'none';
    },

    // ==================== PROJECT PILLS ====================
    renderProjectPills() {
        const container = document.getElementById('project-pills');
        if (!container) return;

        let html = `<button class="project-pill flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition ${!this.currentProjectId ? 'bg-primary text-white' : 'bg-card dark:bg-stone-200 text-stone-300 dark:text-stone-700 border border-stone-700 dark:border-stone-300'}" data-project="">Всё</button>`;

        this.projects.forEach(p => {
            const isActive = this.currentProjectId === p.id;
            html += `<button class="project-pill flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition ${isActive ? 'bg-primary text-white' : 'bg-card dark:bg-stone-200 text-stone-300 dark:text-stone-700 border border-stone-700 dark:border-stone-300'}" data-project="${p.id}">${p.name}</button>`;
        });

        html += `<button id="add-project-pill" class="project-pill flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center hover:bg-primary/40 transition">+</button>`;

        container.innerHTML = html;

        // Event listeners
        container.querySelectorAll('.project-pill[data-project]').forEach(pill => {
            pill.addEventListener('click', () => {
                const projectId = pill.dataset.project;
                // Пустая строка означает "все записи" → null
                this.currentProjectId = projectId === '' ? null : projectId;
                this.renderProjectPills();
                this.filter();
            });
        });

        const addPill = document.getElementById('add-project-pill');
        if (addPill) {
            addPill.addEventListener('click', () => this.showCreateProjectModal());
        }
    },

    renderModalProjectPills() {
        const container = document.getElementById('modal-project-pills');
        if (!container) return;

        let html = `<button class="modal-project-pill flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition ${!this.selectedProjectId ? 'bg-primary text-white' : 'bg-darker dark:bg-stone-200 text-stone-400 dark:text-stone-600 border border-stone-700 dark:border-stone-300'}" data-project="">Без проекта</button>`;

        this.projects.forEach(p => {
            const isActive = this.selectedProjectId === p.id;
            html += `<button class="modal-project-pill flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition ${isActive ? 'bg-primary text-white' : 'bg-darker dark:bg-stone-200 text-stone-400 dark:text-stone-600 border border-stone-700 dark:border-stone-300'}" data-project="${p.id}">${p.name}</button>`;
        });

        html += `<button id="modal-add-project" class="modal-project-pill flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/20 text-primary border border-primary/30 hover:bg-primary/40 transition">+ Новый</button>`;

        container.innerHTML = html;

        container.querySelectorAll('.modal-project-pill[data-project]').forEach(pill => {
            pill.addEventListener('click', (e) => {
                e.preventDefault();
                this.selectedProjectId = pill.dataset.project || null;
                this.renderModalProjectPills();
                document.getElementById('new-project-input')?.classList.add('hidden');
            });
        });

        const addBtn = document.getElementById('modal-add-project');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                document.getElementById('new-project-input')?.classList.remove('hidden');
                document.getElementById('modal-new-project-name')?.focus();
            });
        }
    },

    // ==================== EVENT LISTENERS ====================
    setupEventListeners() {
        const searchInput = document.getElementById('search-input');
        const clearSearch = document.getElementById('clear-search');

        let searchTimeout;
        searchInput?.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.currentQuery = e.target.value;
                this.filter();
                clearSearch?.classList.toggle('hidden', !e.target.value);
            }, 300);
        });

        clearSearch?.addEventListener('click', () => {
            searchInput.value = '';
            this.currentQuery = '';
            this.filter();
            clearSearch.classList.add('hidden');
        });

        document.getElementById('add-btn')?.addEventListener('click', () => this.addNew());
        document.getElementById('empty-add-btn')?.addEventListener('click', () => this.addNew());

        document.getElementById('close-modal')?.addEventListener('click', () => {
            UI.closeModal();
            this.currentMemory = null;
        });

        document.getElementById('save-memory')?.addEventListener('click', () => this.saveMemory());
        document.getElementById('delete-memory')?.addEventListener('click', () => this.deleteMemory());

        // Mood buttons
        document.querySelectorAll('.mood-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectedMood = btn.dataset.mood;
                document.querySelectorAll('.mood-btn').forEach(b => {
                    b.classList.remove('border-primary', 'bg-primary/20');
                    b.classList.add('border-stone-700', 'dark:border-stone-300');
                });
                btn.classList.add('border-primary', 'bg-primary/20');
                btn.classList.remove('border-stone-700', 'dark:border-stone-300');
            });
        });

        // Tags
        document.getElementById('tags-btn')?.addEventListener('click', () => {
            TagsManager.renderCloud(this.memories);
            UI.openTagsModal();
        });
        document.getElementById('close-tags')?.addEventListener('click', () => UI.closeTagsModal());

        // Memory modal close on backdrop
        document.getElementById('memory-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'memory-modal') {
                UI.closeModal();
                this.currentMemory = null;
            }
        });

        document.getElementById('tags-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'tags-modal') UI.closeTagsModal();
        });

        // Create project modal
        document.getElementById('close-project-modal')?.addEventListener('click', () => this.hideCreateProjectModal());
        document.getElementById('cancel-create-project')?.addEventListener('click', () => this.hideCreateProjectModal());
        document.getElementById('confirm-create-project')?.addEventListener('click', () => this.confirmCreateProject());
    },

    // ==================== PWA ====================
    setupPWA() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js')
                .then(() => console.log('SW registered'))
                .catch(err => console.error('SW failed:', err));
        }
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
        });
    },

    // ==================== AI ====================
    async setupAI() {
        AIService.onProgress = (progress, message) => UI.showAIProgress(progress, message);
        AIService.onReady = () => {
            UI.hideAIProgress();
            document.body.classList.add('ai-ready');
        };
        AIService.onError = (error) => {
            console.error('AI Error:', error);
            UI.hideAIProgress();
        };

        const initialized = await AIService.init();
        if (!initialized) UI.hideAIProgress();
    },

    // ==================== FILTER ====================
    filter() {
        let filtered = this.memories;

        // Если currentProjectId === null или '' — показываем все записи
        // Если currentProjectId === 'none' — показываем записи без проекта
        // Иначе фильтруем по выбранному проекту
        if (this.currentProjectId === 'none') {
            filtered = filtered.filter(m => !m.projectId);
        } else if (this.currentProjectId) {
            filtered = filtered.filter(m => m.projectId === this.currentProjectId);
        }
        // Если currentProjectId === null или '', фильтр не применяем — все записи

        if (this.currentQuery) {
            filtered = SearchEngine.search(filtered, this.currentQuery);
        }

        filtered = TagsManager.filterByTags(filtered);
        UI.renderMemories(filtered, this.currentQuery);

        // Update empty state
        const emptyState = document.getElementById('empty-state');
        const list = document.getElementById('memories-list');
        if (emptyState && list) {
            emptyState.classList.toggle('hidden', filtered.length > 0);
            list.classList.toggle('hidden', filtered.length === 0);
        }
    },

    // ==================== MEMORY CRUD ====================
    async addNew() {
        this.currentMemory = null;
        this.selectedMood = 'routine';
        this.selectedProjectId = null;
        this.renderModalProjectPills();
        UI.clearModal();
        this.resetMoodButtons();
        UI.openModal();
    },

    async openMemory(id) {
        const memory = await DB.get(id);
        if (!memory) return;

        this.currentMemory = memory;
        this.selectedMood = memory.mood || 'routine';
        this.selectedProjectId = memory.projectId || null;
        this.renderModalProjectPills();
        UI.fillModal(memory);
        this.setMoodButton(this.selectedMood);
        UI.openModal();
    },

    setMoodButton(mood) {
        document.querySelectorAll('.mood-btn').forEach(btn => {
            if (btn.dataset.mood === mood) {
                btn.classList.add('border-primary', 'bg-primary/20');
                btn.classList.remove('border-stone-700', 'dark:border-stone-300');
            } else {
                btn.classList.remove('border-primary', 'bg-primary/20');
                btn.classList.add('border-stone-700', 'dark:border-stone-300');
            }
        });
    },

    resetMoodButtons() {
        document.querySelectorAll('.mood-btn').forEach(btn => {
            btn.classList.remove('border-primary', 'bg-primary/20');
            btn.classList.add('border-stone-700', 'dark:border-stone-300');
        });
        // Select routine by default
        const routine = document.querySelector('.mood-btn[data-mood="routine"]');
        if (routine) {
            routine.classList.add('border-primary', 'bg-primary/20');
            routine.classList.remove('border-stone-700', 'dark:border-stone-300');
        }
    },

    async saveMemory() {
        const data = UI.getModalData();

        // Handle new project creation
        const newProjectInput = document.getElementById('modal-new-project-name');
        if (newProjectInput?.value.trim()) {
            const newProject = await ProjectService.createProject(newProjectInput.value.trim());
            this.selectedProjectId = newProject.id;
            await this.loadProjects();
            this.renderModalProjectPills();
            newProjectInput.value = '';
            document.getElementById('new-project-input')?.classList.add('hidden');
        }

        if (!data.title && !data.content) {
            alert('Введите заголовок или текст');
            return;
        }

        const memory = {
            id: this.currentMemory ? this.currentMemory.id : Date.now().toString(),
            title: data.title || 'Без названия',
            date: data.date || new Date().toISOString().split('T')[0],
            content: data.content,
            tags: data.tags,
            projectId: this.selectedProjectId,
            mood: this.selectedMood,
            createdAt: this.currentMemory ? this.currentMemory.createdAt : Date.now(),
            updatedAt: Date.now()
        };

        if (this.currentMemory) await DB.update(memory);
        else await DB.add(memory);

        await this.loadMemories();
        TagsManager.load(this.memories);
        this.filter();
        UI.closeModal();
        this.currentMemory = null;

        if (AIService.isReady && !this.aiProcessing) {
            this.processWithAI(memory);
        }
    },

    async deleteMemory() {
        if (!this.currentMemory) return;
        if (!confirm('Удалить эту запись?')) return;

        await DB.delete(this.currentMemory.id);
        await this.loadMemories();
        TagsManager.load(this.memories);
        this.filter();
        UI.closeModal();
        this.currentMemory = null;
    },

    // ==================== PROJECTS ====================
    showCreateProjectModal() {
        document.getElementById('create-project-modal')?.classList.remove('hidden');
        document.getElementById('new-project-name')?.focus();
    },

    hideCreateProjectModal() {
        document.getElementById('create-project-modal')?.classList.add('hidden');
        document.getElementById('new-project-name').value = '';
        document.getElementById('new-project-desc').value = '';
    },

    async confirmCreateProject() {
        const name = document.getElementById('new-project-name')?.value.trim();
        if (!name) return;

        const desc = document.getElementById('new-project-desc')?.value.trim() || '';
        const colors = ['#ea580c', '#3b82f6', '#22c55e', '#a855f7', '#ef4444', '#f59e0b', '#06b6d4', '#ec4899'];
        const color = colors[this.projects.length % colors.length];

        await ProjectService.createProject(name, desc, color);
        await this.loadProjects();
        this.hideCreateProjectModal();
    },

    // ==================== ANALYTICS TAB ====================
    setupAnalytics() {
        document.querySelectorAll('.analytics-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                this.renderAnalyticsContent(tab);
            });
        });
    },

    renderAnalyticsTab() {
        this.renderAnalyticsContent('summary');
    },

    async renderAnalyticsContent(tab) {
        const container = document.getElementById('analytics-content');
        if (!container) return;
        container.innerHTML = '<p class="text-stone-500 dark:text-stone-400 text-center py-8">Загрузка...</p>';

        // Обновляем активную кнопку
        document.querySelectorAll('.analytics-tab-btn').forEach(btn => {
            if (btn.dataset.tab === tab) {
                btn.classList.add('bg-primary', 'text-white');
                btn.classList.remove('text-stone-400', 'dark:text-stone-600');
            } else {
                btn.classList.remove('bg-primary', 'text-white');
                btn.classList.add('text-stone-400', 'dark:text-stone-600');
            }
        });

        switch (tab) {
            case 'summary': this.renderSummaryStats(container); break;
            case 'moods': this.renderMoodAnalytics(container); break;
            case 'tags': this.renderTagAnalytics(container); break;
            case 'insights': this.renderInsightsContent(container); break;
        }
    },

    async renderSummaryStats(container) {
        const totalMemories = this.memories.length;
        const totalProjects = this.projects.length;
        
        // Подсчет записей за последние 7 дней
        const weekAgo = Date.now() - (7 * 86400000);
        const weekCount = this.memories.filter(m => m.createdAt >= weekAgo).length;
        
        // Подсчет серий (дней подряд с записями)
        let streak = 0;
        const today = new Date().toISOString().split('T')[0];
        const dates = [...new Set(this.memories.map(m => m.date))].sort().reverse();
        for (let i = 0; i < dates.length; i++) {
            const expectedDate = new Date();
            expectedDate.setDate(expectedDate.getDate() - i);
            const expectedStr = expectedDate.toISOString().split('T')[0];
            if (dates.includes(expectedStr)) {
                streak++;
            } else if (i > 0) {
                break;
            }
        }
        
        // Топ тегов
        const tagCounts = {};
        this.memories.forEach(m => {
            [...(m.tags || []), ...(m.aiTags || [])].forEach(t => {
                tagCounts[t] = (tagCounts[t] || 0) + 1;
            });
        });
        const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
        
        // Распределение настроений
        const moodCounts = {};
        this.memories.forEach(m => {
            const mood = m.mood || 'routine';
            moodCounts[mood] = (moodCounts[mood] || 0) + 1;
        });
        const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];
        const topMoodInfo = topMood ? ProjectService.MOODS[topMood[0]] : ProjectService.MOODS.routine;

        let html = `
            <div class="space-y-4">
                <!-- Основная статистика -->
                <div class="grid grid-cols-2 gap-3">
                    <div class="bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl p-4 text-center border border-primary/30">
                        <p class="text-3xl font-bold text-primary">${totalMemories}</p>
                        <p class="text-xs text-stone-400 dark:text-stone-500 mt-1">Всего записей</p>
                    </div>
                    <div class="bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl p-4 text-center border border-blue-400/30">
                        <p class="text-3xl font-bold text-blue-400">${totalProjects}</p>
                        <p class="text-xs text-stone-400 dark:text-stone-500 mt-1">Проектов</p>
                    </div>
                </div>
                
                <!-- Серия и неделя -->
                <div class="grid grid-cols-2 gap-3">
                    <div class="bg-card dark:bg-white rounded-xl p-4 text-center">
                        <p class="text-3xl font-bold text-orange-400">🔥 ${streak}</p>
                        <p class="text-xs text-stone-400 dark:text-stone-500 mt-1">Дней подряд</p>
                    </div>
                    <div class="bg-card dark:bg-white rounded-xl p-4 text-center">
                        <p class="text-3xl font-bold text-green-400">${weekCount}</p>
                        <p class="text-xs text-stone-400 dark:text-stone-500 mt-1">За 7 дней</p>
                    </div>
                </div>
                
                <!-- Топ настроение -->
                ${topMood ? `
                <div class="bg-card dark:bg-white rounded-xl p-4">
                    <div class="flex items-center gap-3">
                        <span class="text-4xl">${topMoodInfo.emoji}</span>
                        <div>
                            <p class="text-sm text-stone-400 dark:text-stone-500">Чаще всего</p>
                            <p class="font-semibold text-stone-100 dark:text-stone-900">${topMoodInfo.label}</p>
                            <p class="text-xs text-stone-500 dark:text-stone-400">${topMood[1]} раз</p>
                        </div>
                    </div>
                </div>
                ` : ''}
                
                <!-- Топ теги -->
                ${topTags.length > 0 ? `
                <div class="bg-card dark:bg-white rounded-xl p-4">
                    <p class="text-sm text-stone-400 dark:text-stone-500 mb-3">Популярные теги</p>
                    <div class="flex flex-wrap gap-2">
                        ${topTags.map(([tag, count]) => `
                            <span class="tag text-sm">${tag} <span class="opacity-60">(${count})</span></span>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
        `;
        
        container.innerHTML = html;
    },

    async renderMoodAnalytics(container) {
        const recent = this.memories.filter(m => {
            const days = (Date.now() - m.createdAt) / (86400000);
            return days <= 30;
        });

        const moodCounts = {};
        recent.forEach(m => {
            const mood = m.mood || 'routine';
            moodCounts[mood] = (moodCounts[mood] || 0) + 1;
        });

        const total = recent.length || 1;
        const sorted = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]);

        if (sorted.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <p class="text-4xl mb-3">📊</p>
                    <p class="text-stone-500 dark:text-stone-400">Нет данных за последние 30 дней</p>
                </div>`;
            return;
        }

        let html = `<div class="bg-card dark:bg-white rounded-xl p-4">
            <div class="text-center mb-4">
                <p class="text-3xl font-bold text-primary">${recent.length}</p>
                <p class="text-xs text-stone-500 dark:text-stone-400">записей за 30 дней</p>
            </div>
            <div class="space-y-3">`;

        sorted.forEach(([mood, count]) => {
            const info = ProjectService.MOODS[mood] || ProjectService.MOODS.routine;
            const percent = Math.round((count / total) * 100);
            html += `
                <div class="flex items-center gap-3">
                    <span class="text-lg w-7 text-center">${info.emoji}</span>
                    <span class="text-sm text-stone-400 dark:text-stone-500 w-20">${info.label}</span>
                    <div class="flex-1 h-3 bg-stone-700 dark:bg-stone-200 rounded-full overflow-hidden">
                        <div class="h-full rounded-full transition-all duration-500" style="width: ${percent}%; background: ${info.color}"></div>
                    </div>
                    <span class="text-sm text-stone-500 dark:text-stone-400 w-8 text-right">${count}</span>
                </div>`;
        });

        html += '</div></div>';
        container.innerHTML = html;
    },

    async renderTagAnalytics(container) {
        const tagCounts = {};
        this.memories.forEach(m => {
            [...(m.tags || []), ...(m.aiTags || [])].forEach(t => {
                tagCounts[t] = (tagCounts[t] || 0) + 1;
            });
        });

        const sorted = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);

        if (sorted.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <p class="text-4xl mb-3">🏷️</p>
                    <p class="text-stone-500 dark:text-stone-400">Нет тегов</p>
                </div>`;
            return;
        }

        const maxCount = sorted[0][1];
        let html = '<div class="flex flex-wrap gap-2">';
        sorted.forEach(([tag, count]) => {
            const ratio = count / maxCount;
            const size = ratio > 0.7 ? 'text-lg px-4 py-2' : ratio > 0.4 ? 'text-sm px-3 py-1.5' : 'text-xs px-2 py-1';
            html += `<span class="tag ${size}">${tag} (${count})</span>`;
        });
        html += '</div>';
        container.innerHTML = html;
    },

    async renderInsightsContent(container) {
        const recent = this.memories.filter(m => (Date.now() - m.createdAt) / 86400000 <= 30);
        const insights = [];

        if (recent.length === 0) {
            container.innerHTML = `<div class="text-center py-12"><p class="text-stone-500 dark:text-stone-400">Недостаточно данных</p></div>`;
            return;
        }

        const moodCounts = {};
        recent.forEach(m => { moodCounts[m.mood || 'routine'] = (moodCounts[m.mood || 'routine'] || 0) + 1; });

        if ((moodCounts.breakthrough || 0) > (moodCounts.blocker || 0) && moodCounts.breakthrough > 2)
            insights.push('🔥 Отличный период! Много прорывов. Записывайте, что работает.');
        if (moodCounts.blocker > 2)
            insights.push('🚧 Много блокеров. Возможно, нужна помощь или пересмотр приоритетов?');
        if (recent.length < 5)
            insights.push('📊 Мало записей за месяц. Попробуйте писать чаще.');
        if (recent.length > 0) {
            const avgContentLength = recent.reduce((sum, m) => sum + (m.content?.length || 0), 0) / recent.length;
            if (avgContentLength > 500) insights.push('📝 Вы пишете длинные записи — это отлично для рефлексии!');
        }

        let html = '<div class="space-y-3">';
        insights.forEach(i => {
            html += `<div class="bg-card dark:bg-white rounded-xl p-4 border border-primary/20"><p class="text-sm text-stone-300 dark:text-stone-700">${i}</p></div>`;
        });
        html += '</div>';
        container.innerHTML = html;
    },

    // ==================== PROJECTS TAB ====================
    renderProjectsTab() {
        const container = document.getElementById('projects-list');
        const empty = document.getElementById('projects-empty');
        if (!container || !empty) return;

        if (this.projects.length === 0) {
            container.innerHTML = '';
            empty.classList.remove('hidden');
            return;
        }

        empty.classList.add('hidden');
        let html = '<div class="space-y-3">';

        this.projects.forEach(p => {
            const count = this.memories.filter(m => m.projectId === p.id).length;
            html += `
                <div class="bg-card dark:bg-white rounded-xl p-4 border border-stone-800 dark:border-stone-200">
                    <div class="flex items-center gap-3 mb-2">
                        <div class="w-4 h-4 rounded-full flex-shrink-0" style="background: ${p.color || '#ea580c'}"></div>
                        <h3 class="font-semibold text-stone-100 dark:text-stone-900 flex-1">${p.name}</h3>
                        <span class="text-sm text-stone-500 dark:text-stone-400">${count} ${count === 1 ? 'запись' : count < 5 ? 'записи' : 'записей'}</span>
                    </div>
                    ${p.description ? `<p class="text-sm text-stone-400 dark:text-stone-500 ml-7">${p.description}</p>` : ''}
                    <div class="flex gap-2 mt-3 ml-7">
                        <button class="open-project-btn text-xs bg-primary/20 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/40 transition" data-project="${p.id}">Открыть</button>
                        <button class="archive-project-btn text-xs bg-stone-700 dark:bg-stone-200 text-stone-400 dark:text-stone-600 px-3 py-1.5 rounded-lg hover:bg-stone-600 transition" data-project="${p.id}">Архив</button>
                    </div>
                </div>`;
        });

        html += `
            <button id="create-project-fab" class="w-full py-4 rounded-xl border-2 border-dashed border-stone-700 dark:border-stone-300 text-stone-500 dark:text-stone-400 hover:border-primary hover:text-primary transition flex items-center justify-center gap-2">
                <span class="text-xl">+</span>
                <span>Создать проект</span>
            </button>`;

        html += '</div>';
        container.innerHTML = html;

        container.querySelectorAll('.open-project-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentProjectId = btn.dataset.project;
                this.renderProjectPills();
                this.switchTab('memories');
                this.filter();
            });
        });

        container.querySelectorAll('.archive-project-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('Архивировать проект?')) {
                    await ProjectService.archiveProject(btn.dataset.project);
                    await this.loadProjects();
                    this.renderProjectsTab();
                }
            });
        });

        document.getElementById('create-project-fab')?.addEventListener('click', () => this.showCreateProjectModal());
    },

    // ==================== SETTINGS ====================
    setupSettings() {
        // Dark mode toggle
        const darkToggle = document.getElementById('dark-mode-toggle');
        if (darkToggle) {
            // checked=true означает тёмная тема включена
            const isDark = !document.documentElement.classList.contains('dark');
            darkToggle.checked = isDark;
            darkToggle.addEventListener('change', () => this.toggleTheme());
        }

        // Theme toggle button in header
        document.getElementById('theme-toggle')?.addEventListener('click', () => {
            this.toggleTheme();
        });

        // AI toggle
        const aiToggle = document.getElementById('ai-toggle');
        if (aiToggle) {
            aiToggle.checked = AIService.isEnabled !== false;
            aiToggle.addEventListener('change', async () => {
                await AIService.toggle(aiToggle.checked);
            });
        }

        // Retraining
        document.getElementById('retrain-ai-btn')?.addEventListener('click', async () => {
            UI.showAIProgress(0, 'Обновление корпуса...');
            const texts = this.memories.map(m => m.content).filter(Boolean);
            if (AIService.isReady) {
                await AIService.updateCorpus(texts);
                UI.showAINotification('Корпус обновлён');
            }
            UI.hideAIProgress();
        });

        // Export
        document.getElementById('export-data-btn')?.addEventListener('click', () => this.exportData());

        // Import
        document.getElementById('import-data-btn')?.addEventListener('click', () => this.importData());

        // Reset onboarding
        document.getElementById('reset-onboarding-btn')?.addEventListener('click', () => {
            if (confirm('Сбросить онбординг?')) Onboarding.reset();
        });
    },

    refreshSettings() {
        const darkToggle = document.getElementById('dark-mode-toggle');
        if (darkToggle) darkToggle.checked = !document.documentElement.classList.contains('dark');
        const aiToggle = document.getElementById('ai-toggle');
        if (aiToggle) aiToggle.checked = AIService.isEnabled !== false;
        
        // Update theme toggle button emoji
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            toggleBtn.textContent = document.documentElement.classList.contains('dark') ? '🌙' : '☀️';
        }
    },

    toggleTheme() {
        const html = document.documentElement;
        const body = document.body;
        const isDark = html.classList.contains('dark');
        
        if (isDark) {
            // Сейчас светлая тема (класс dark есть), переключаем на тёмную
            html.classList.remove('dark');
            body.classList.remove('bg-stone-50', 'text-stone-900');
            body.classList.add('bg-darker', 'text-gray-100');
            localStorage.setItem('memoria-dark-mode', 'true');
        } else {
            // Сейчас тёмная тема (класса dark нет), переключаем на светлую
            html.classList.add('dark');
            body.classList.remove('bg-darker', 'text-gray-100');
            body.classList.add('bg-stone-50', 'text-stone-900');
            localStorage.setItem('memoria-dark-mode', 'false');
        }

        // Обновляем иконку кнопки переключения темы
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            toggleBtn.textContent = html.classList.contains('dark') ? '☀️' : '🌙';
        }
        
        // Синхронизируем чекбокс в настройках
        const darkToggle = document.getElementById('dark-mode-toggle');
        if (darkToggle) {
            darkToggle.checked = !html.classList.contains('dark');
        }
    },

    initTheme() {
        const saved = localStorage.getItem('memoria-dark-mode');
        // saved === null → не задано → тёмная тема (по умолчанию)
        // saved === 'true' → тёмная тема
        // saved === 'false' → светлая тема
        const isDark = saved === null ? true : saved === 'true';
        
        const html = document.documentElement;
        const body = document.body;
        
        if (isDark) {
            // Тёмная тема: не добавляем класс dark
            html.classList.remove('dark');
            body.classList.remove('bg-stone-50', 'text-stone-900');
            body.classList.add('bg-darker', 'text-gray-100');
        } else {
            // Светлая тема: добавляем класс dark для Tailwind
            html.classList.add('dark');
            body.classList.remove('bg-darker', 'text-gray-100');
            body.classList.add('bg-stone-50', 'text-stone-900');
        }

        // Обновляем иконку кнопки переключения темы
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            toggleBtn.textContent = isDark ? '🌙' : '☀️';
        }
        
        // Синхронизируем чекбокс в настройках
        const darkToggle = document.getElementById('dark-mode-toggle');
        if (darkToggle) {
            darkToggle.checked = isDark;
        }
    },

    exportData() {
        const data = {
            version: 2,
            exportedAt: new Date().toISOString(),
            memories: this.memories,
            projects: this.projects
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `memoria-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        UI.showAINotification('Экспорт завершён');
    },

    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const data = JSON.parse(text);

                if (data.memories) {
                    for (const m of data.memories) {
                        const exists = await DB.get(m.id);
                        if (!exists) await DB.add(m);
                        else await DB.update(m);
                    }
                }
                if (data.projects) {
                    await ProjectService.saveProjects(data.projects);
                }

                await this.loadMemories();
                await this.loadProjects();
                TagsManager.load(this.memories);
                this.filter();
                UI.showAINotification(`Импортировано ${data.memories?.length || 0} записей`);
            } catch (err) {
                alert('Ошибка импорта: ' + err.message);
            }
        });
        input.click();
    },

    // ==================== AI PROCESSING ====================
    async processWithAI(memory) {
        this.aiProcessing = true;
        try {
            UI.showAIProgress(0, 'Анализ текста...');
            const { tags, summary, mood } = await AIService.processMemory(memory, this.memories);

            const updates = {};
            if (tags.length > 0) updates.aiTags = tags;
            if (summary) updates.aiSummary = summary;
            if (mood && (!memory.mood || memory.mood === 'routine')) updates.mood = mood;

            if (Object.keys(updates).length > 0) {
                await DB.update({ ...memory, ...updates, updatedAt: Date.now() });
                await this.loadMemories();
                TagsManager.load(this.memories);
                this.filter();

                const parts = [];
                if (tags.length > 0) parts.push(`${tags.length} тегов`);
                if (summary) parts.push('краткое содержание');
                if (updates.mood) parts.push('настроение');
                UI.showAINotification(`AI: ${parts.join(', ')}`);
            }
        } catch (err) {
            console.error('AI processing failed:', err);
        } finally {
            this.aiProcessing = false;
            UI.hideAIProgress();
        }
    },

    async refreshTags() {
        TagsManager.clearActive();
        TagsManager.load(this.memories);
        UI.openTagsModal();
        TagsManager.renderCloud(this.memories);
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
