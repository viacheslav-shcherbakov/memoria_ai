// project-service.js - Управление проектами и аналитика

const ProjectService = {
    PROJECTS_KEY: 'memoria-projects',
    MOODS: {
        breakthrough: { emoji: '🔥', label: 'Прорыв', color: '#ef4444' },
        routine: { emoji: '🐌', label: 'Рутина', color: '#6b7280' },
        blocker: { emoji: '🚧', label: 'Блокер', color: '#f59e0b' },
        solved: { emoji: '✅', label: 'Решено', color: '#22c55e' },
        research: { emoji: '🔬', label: 'Исследование', color: '#8b5cf6' },
        experiment: { emoji: '🧪', label: 'Эксперимент', color: '#ec4899' }
    },

    // Получить все проекты
    async getProjects() {
        const stored = localStorage.getItem(this.PROJECTS_KEY);
        if (!stored) return [];
        try {
            return JSON.parse(stored);
        } catch {
            return [];
        }
    },

    // Сохранить проекты
    async saveProjects(projects) {
        localStorage.setItem(this.PROJECTS_KEY, JSON.stringify(projects));
    },

    // Создать проект
    async createProject(name, description = '', color = '#ea580c') {
        const projects = await this.getProjects();
        const project = {
            id: Date.now().toString(),
            name,
            description,
            color,
            createdAt: Date.now(),
            active: true
        };
        projects.push(project);
        await this.saveProjects(projects);
        return project;
    },

    // Удалить проект (мягкое удаление)
    async archiveProject(projectId) {
        const projects = await this.getProjects();
        const index = projects.findIndex(p => p.id === projectId);
        if (index !== -1) {
            projects[index].active = false;
            projects[index].archivedAt = Date.now();
            await this.saveProjects(projects);
        }
    },

    // Получить активные проекты
    async getActiveProjects() {
        const projects = await this.getProjects();
        return projects.filter(p => p.active !== false);
    },

    // Обновить проект
    async updateProject(projectId, updates) {
        const projects = await this.getProjects();
        const index = projects.findIndex(p => p.id === projectId);
        if (index !== -1) {
            projects[index] = { ...projects[index], ...updates, updatedAt: Date.now() };
            await this.saveProjects(projects);
            return projects[index];
        }
        return null;
    },

    // Получить записи по проекту
    async getMemoriesByProject(projectId) {
        const all = await DB.getAll();
        return all.filter(m => m.projectId === projectId).sort((a, b) => b.createdAt - a.createdAt);
    },

    // Генерация отчёта по проекту
    async generateProjectReport(projectId, days = 30) {
        const memories = await this.getMemoriesByProject(projectId);
        const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
        const recent = memories.filter(m => m.createdAt > cutoff);

        const report = {
            total: memories.length,
            recent: recent.length,
            moodDistribution: {},
            tagCloud: {},
            timeline: [],
            insights: []
        };

        // Распределение настроений
        recent.forEach(m => {
            const mood = m.mood || 'routine';
            report.moodDistribution[mood] = (report.moodDistribution[mood] || 0) + 1;
        });

        // Облако тегов
        recent.forEach(m => {
            const tags = [...(m.tags || []), ...(m.aiTags || [])];
            tags.forEach(tag => {
                report.tagCloud[tag] = (report.tagCloud[tag] || 0) + 1;
            });
        });

        // Таймлайн ключевых моментов
        report.timeline = recent
            .filter(m => m.mood === 'breakthrough' || m.mood === 'solved' || m.mood === 'blocker')
            .slice(0, 10)
            .map(m => ({
                date: m.date,
                title: m.title,
                mood: m.mood,
                preview: m.content?.slice(0, 100) + '...'
            }));

        // AI-инсайты
        const breakthroughs = report.moodDistribution.breakthrough || 0;
        const blockers = report.moodDistribution.blocker || 0;
        const solved = report.moodDistribution.solved || 0;

        if (breakthroughs > blockers) {
            report.insights.push('Период прорывов! Вы в потоке.');
        } else if (blockers > solved) {
            report.insights.push('Много блокеров — возможно, нужна помощь или ресурсы?');
        } else if (solved > 0) {
            report.insights.push('Хороший баланс решений и прогресса.');
        }

        if (recent.length === 0) {
            report.insights.push('Давно не было записей по проекту. Всё ли в порядке?');
        }

        return report;
    },

    // Еженедельный отчёт по всем проектам
    async generateWeeklyDigest() {
        const projects = await this.getActiveProjects();
        const digest = {
            weekStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU'),
            weekEnd: new Date().toLocaleDateString('ru-RU'),
            projects: []
        };

        for (const project of projects) {
            const report = await this.generateProjectReport(project.id, 7);
            if (report.recent > 0) {
                digest.projects.push({
                    name: project.name,
                    color: project.color,
                    entries: report.recent,
                    breakthroughs: report.moodDistribution.breakthrough || 0,
                    blockers: report.moodDistribution.blocker || 0,
                    topTags: Object.entries(report.tagCloud)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 3)
                        .map(([tag]) => tag)
                });
            }
        }

        return digest;
    },

    // Экспорт проекта в Markdown
    async exportProjectToMarkdown(projectId) {
        const project = (await this.getProjects()).find(p => p.id === projectId);
        if (!project) return null;

        const memories = await this.getMemoriesByProject(projectId);
        
        let md = `# ${project.name}\n\n`;
        if (project.description) {
            md += `> ${project.description}\n\n`;
        }
        md += `*Всего записей: ${memories.length}*\n\n`;
        md += `---\n\n`;

        memories.forEach(m => {
            const mood = this.MOODS[m.mood] || this.MOODS.routine;
            md += `## ${mood.emoji} ${m.title} (${m.date})\n\n`;
            if (m.content) {
                md += `${m.content}\n\n`;
            }
            const allTags = [...new Set([...(m.tags || []), ...(m.aiTags || [])])];
            if (allTags.length > 0) {
                md += `*Теги: ${allTags.join(', ')}*\n\n`;
            }
            md += `---\n\n`;
        });

        return md;
    }
};

window.ProjectService = ProjectService;
