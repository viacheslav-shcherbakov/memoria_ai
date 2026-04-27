const UI = {
    renderMemories(memories, query = '') {
        const container = document.getElementById('memories-list');
        const emptyState = document.getElementById('empty-state');

        if (!container) return;

        if (memories.length === 0) {
            container.innerHTML = '';
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }

        if (emptyState) emptyState.classList.add('hidden');

        container.innerHTML = memories.map(memory => this.renderCard(memory, query)).join('');

        container.querySelectorAll('.memory-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;
                const id = card.dataset.id;
                App.openMemory(id);
            });
        });
    },

    renderCard(memory, query = '') {
        const title = memory.title || 'Без названия';
        const content = memory.content || '';
        const date = memory.date ? this.formatDate(memory.date) : '';
        const tags = memory.tags || [];
        const aiTags = memory.aiTags || [];
        const aiSummary = memory.aiSummary;
        const mood = memory.mood || 'routine';
        const moodInfo = ProjectService.MOODS[mood] || ProjectService.MOODS.routine;

        const previewText = content.substring(0, 100) + (content.length > 100 ? '...' : '');
        const highlightedTitle = query ? SearchEngine.highlightMatches(title, query) : this.escapeHtml(title);
        const highlightedPreview = query ? SearchEngine.highlightMatches(previewText, query) : this.escapeHtml(previewText);
        const highlightedContent = query ? SearchEngine.highlightMatches(content, query) : this.escapeHtml(content);

        const allTags = [...new Set([...tags, ...aiTags])];

        return `
            <div class="memory-card animate-fade-in relative" data-id="${memory.id}">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                            <span class="text-sm" title="${moodInfo.label}">${moodInfo.emoji}</span>
                            <h3 class="font-semibold text-white truncate">${highlightedTitle}</h3>
                        </div>
                        ${date ? `<p class="text-xs text-stone-500 mt-1">${date}</p>` : ''}
                    </div>
                    <span class="expand-icon text-stone-500 ml-2 flex-shrink-0">▼</span>
                </div>

                <p class="preview text-sm text-stone-400 line-clamp-2">${highlightedPreview}</p>

                <div class="full-content mt-3">
                    ${aiSummary ? `<div class="bg-stone-800/50 border border-stone-700 rounded-lg p-3 mb-3">
                        <p class="text-xs text-stone-500 mb-1">🤖 Краткое содержание:</p>
                        <p class="text-sm text-stone-300 italic">${this.escapeHtml(aiSummary)}</p>
                    </div>` : ''}
                    <p class="text-sm text-stone-300 whitespace-pre-wrap">${highlightedContent}</p>
                </div>

                ${allTags.length > 0 ? `
                    <div class="mt-3 flex flex-wrap gap-1">
                        ${tags.map(tag => `<span class="tag text-xs manual-tag">${this.escapeHtml(tag)}</span>`).join('')}
                        ${aiTags.filter(t => !tags.includes(t)).map(tag => `<span class="tag text-xs ai-tag opacity-70">${this.escapeHtml(tag)}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    },

    formatDate(dateStr) {
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } catch {
            return dateStr;
        }
    },

    openModal() {
        const modal = document.getElementById('memory-modal');
        if (modal) {
            modal.classList.add('active');
            modal.classList.remove('hidden');
            document.body.classList.add('modal-open');
        }
    },

    closeModal() {
        const modal = document.getElementById('memory-modal');
        if (modal) {
            modal.classList.remove('active');
            document.body.classList.remove('modal-open');
            setTimeout(() => modal.classList.add('hidden'), 100);
        }
    },

    openTagsModal() {
        const modal = document.getElementById('tags-modal');
        if (modal) modal.classList.add('active');
    },

    closeTagsModal() {
        const modal = document.getElementById('tags-modal');
        if (modal) modal.classList.remove('active');
    },

    fillModal(memory) {
        document.getElementById('modal-title').value = memory.title || '';
        document.getElementById('modal-date').value = memory.date || '';
        document.getElementById('modal-content').value = memory.content || '';
        // Объединяем ручные и AI теги для редактирования
        const allTags = [...new Set([...(memory.tags || []), ...(memory.aiTags || [])])];
        document.getElementById('modal-tags').value = allTags.join(', ');
    },

    getModalData() {
        const title = document.getElementById('modal-title').value.trim();
        const date = document.getElementById('modal-date').value;
        const content = document.getElementById('modal-content').value.trim();
        const tagsStr = document.getElementById('modal-tags').value;

        const tags = tagsStr
            .split(',')
            .map(t => t.trim().toLowerCase())
            .filter(t => t.length > 0);

        return { title, date, content, tags };
    },

    clearModal() {
        document.getElementById('modal-title').value = '';
        document.getElementById('modal-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('modal-content').value = '';
        document.getElementById('modal-tags').value = '';
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // AI Progress UI
    showAIProgress(progress, message) {
        let progressEl = document.getElementById('ai-progress');
        if (!progressEl) {
            progressEl = document.createElement('div');
            progressEl.id = 'ai-progress';
            progressEl.className = 'fixed top-20 left-4 right-4 max-w-lg mx-auto bg-card border border-primary/30 rounded-xl p-3 z-50 animate-fade-in';
            document.body.appendChild(progressEl);
        }
        
        progressEl.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <span class="text-lg">🤖</span>
                </div>
                <div class="flex-1">
                    <p class="text-sm text-stone-300">${message}</p>
                    <div class="mt-1 h-1 bg-stone-700 rounded-full overflow-hidden">
                        <div class="h-full bg-primary transition-all duration-300" style="width: ${progress}%"></div>
                    </div>
                </div>
            </div>
        `;
        progressEl.classList.remove('hidden');
    },

    hideAIProgress() {
        const progressEl = document.getElementById('ai-progress');
        if (progressEl) {
            progressEl.classList.add('hidden');
        }
    },

    showAINotification(message) {
        const notification = document.createElement('div');
        notification.className = 'fixed bottom-24 left-4 right-4 max-w-sm mx-auto bg-stone-800/95 border border-stone-700 rounded-xl p-3 z-50 animate-fade-in';
        notification.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="text-green-400">✓</span>
                <p class="text-sm text-stone-300">${message}</p>
            </div>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    },

    showAIError(message) {
        const notification = document.createElement('div');
        notification.className = 'fixed bottom-24 left-4 right-4 max-w-sm mx-auto bg-red-900/20 border border-red-500/30 rounded-xl p-3 z-50 animate-fade-in';
        notification.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="text-red-400">⚠</span>
                <p class="text-sm text-stone-300">${message}</p>
            </div>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
};

window.UI = UI;
