const SearchEngine = {
    tokenize(text) {
        if (!text) return [];
        
        const normalized = text.toLowerCase()
            .replace(/[ё]/g, 'е')
            .replace(/[^\w\sа-яё]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        
        return normalized.split(' ').filter(t => t.length > 1);
    },

    getTokens(query) {
        return this.tokenize(query);
    },

    calculateRelevance(memory, queryTokens) {
        let score = 0;

        const titleTokens = this.tokenize(memory.title || '');
        const contentTokens = this.tokenize(memory.content || '');
        const tagsTokens = this.tokenize((memory.tags || []).join(' ') + ' ' + (memory.aiTags || []).join(' '));
        const summaryTokens = this.tokenize(memory.aiSummary || '');

        const allTokens = [...titleTokens, ...contentTokens, ...tagsTokens, ...summaryTokens];
        const tokenSet = [...new Set(allTokens)];

        queryTokens.forEach(qt => {
            if (titleTokens.includes(qt)) {
                score += 10;
            }
            if (tagsTokens.includes(qt)) {
                score += 6;
            }
            if (summaryTokens.includes(qt)) {
                score += 3;
            }
            if (contentTokens.includes(qt)) {
                score += 1;
            }

            tokenSet.forEach(t => {
                if (t.includes(qt) || qt.includes(t)) {
                    score += 0.5;
                }
            });
        });

        return score;
    },

    search(memories, query) {
        if (!query || !query.trim()) {
            return memories.sort((a, b) => new Date(b.date) - new Date(a.date));
        }

        const queryTokens = this.getTokens(query);
        
        if (queryTokens.length === 0) {
            return memories;
        }

        const scored = memories.map(memory => ({
            memory,
            score: this.calculateRelevance(memory, queryTokens)
        }));

        const filtered = scored.filter(s => s.score > 0);
        
        return filtered
            .sort((a, b) => b.score - a.score)
            .map(s => s.memory);
    },

    highlightMatches(text, query) {
        if (!text || !query) return text;
        
        const tokens = this.getTokens(query);
        if (tokens.length === 0) return text;
        
        let result = text;
        const seen = new Set();
        
        tokens.forEach(token => {
            const regex = new RegExp(`(${this.escapeRegex(token)})`, 'gi');
            result = result.replace(regex, (match) => {
                const key = `${match}-${seen.size}`;
                if (seen.has(key)) return match;
                seen.add(key);
                return `<mark class="bg-primary/40 text-white px-1 rounded">${match}</mark>`;
            });
        });
        
        return result;
    },

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
};

window.SearchEngine = SearchEngine;