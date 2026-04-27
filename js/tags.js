const TagsManager = {
    allTags: new Map(),
    activeTags: new Set(),

    async load(memories) {
        this.allTags.clear();

        memories.forEach(memory => {
            const allTags = [...(memory.tags || []), ...(memory.aiTags || [])];
            allTags.forEach(tag => {
                const normalized = tag.toLowerCase().trim();
                if (normalized) {
                    this.allTags.set(normalized, (this.allTags.get(normalized) || 0) + 1);
                }
            });
        });
    },

    getAll() {
        return Array.from(this.allTags.entries())
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count);
    },

    getTop(count = 20) {
        return this.getAll().slice(0, count);
    },

    toggle(tag) {
        const normalized = tag.toLowerCase().trim();
        if (this.activeTags.has(normalized)) {
            this.activeTags.delete(normalized);
        } else {
            this.activeTags.add(normalized);
        }
        return this.activeTags.has(normalized);
    },

    clearActive() {
        this.activeTags.clear();
    },

    getActive() {
        return Array.from(this.activeTags);
    },

    filterByTags(memories) {
        if (this.activeTags.size === 0) {
            return memories;
        }

        return memories.filter(memory => {
            const allTags = [...(memory.tags || []), ...(memory.aiTags || [])];
            const memoryTags = allTags.map(t => t.toLowerCase().trim());
            return Array.from(this.activeTags).some(activeTag =>
                memoryTags.includes(activeTag)
            );
        });
    },

    getFontSize(tag, maxCount) {
        const count = this.allTags.get(tag.toLowerCase()) || 0;
        const ratio = count / maxCount;
        
        if (ratio > 0.8) return 'tag-size-lg';
        if (ratio > 0.4) return 'tag-size-md';
        return 'tag-size-sm';
    },

    renderCloud(memories) {
        const cloud = document.getElementById('tags-cloud');
        if (!cloud) return;

        const tags = this.getAll();
        
        if (tags.length === 0) {
            cloud.innerHTML = '<p class="text-stone-500 text-sm">Нет тегов</p>';
            return;
        }

        const maxCount = Math.max(...tags.map(t => t.count));

        cloud.innerHTML = tags.map(({ tag, count }) => {
            const isActive = this.activeTags.has(tag.toLowerCase());
            const sizeClass = this.getFontSize(tag, maxCount);
            
            return `
                <button class="tag ${sizeClass} ${isActive ? 'active' : ''}" 
                    data-tag="${this.escapeHtml(tag)}">
                    ${this.escapeHtml(tag)} (${count})
                </button>
            `;
        }).join('');

        cloud.querySelectorAll('.tag').forEach(el => {
            el.addEventListener('click', () => {
                const tag = el.dataset.tag;
                this.toggle(tag);
                App.filter();
                this.renderCloud(memories);
            });
        });
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

window.TagsManager = TagsManager;