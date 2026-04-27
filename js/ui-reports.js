// ui-reports.js - UI для отчётов и аналитики

const UIReports = {
    // Рендер панели проектов в шапке
    renderProjectSelector(projects, currentProjectId) {
        const options = [
            '<option value="">Все записи</option>',
            ...projects.map(p => `<option value="${p.id}" ${p.id === currentProjectId ? 'selected' : ''}>${p.name}</option>`)
        ];
        
        return `
            <select id="project-filter" class="flex-1 bg-card border border-stone-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary">
                ${options.join('')}
            </select>
        `;
    },

    // Рендер отчёта по проекту
    renderProjectReport(report, project) {
        const moodBars = Object.entries(report.moodDistribution)
            .sort((a, b) => b[1] - a[1])
            .map(([mood, count]) => {
                const moodInfo = ProjectService.MOODS[mood] || ProjectService.MOODS.routine;
                const total = report.recent || 1;
                const percent = Math.round((count / total) * 100);
                return `
                    <div class="flex items-center gap-2 mb-2">
                        <span class="w-6">${moodInfo.emoji}</span>
                        <span class="text-sm text-stone-400 w-24">${moodInfo.label}</span>
                        <div class="flex-1 h-2 bg-stone-700 rounded-full overflow-hidden">
                            <div class="h-full rounded-full" style="width: ${percent}%; background: ${moodInfo.color}"></div>
                        </div>
                        <span class="text-sm text-stone-500 w-8 text-right">${count}</span>
                    </div>
                `;
            }).join('');

        const topTags = Object.entries(report.tagCloud)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([tag, count]) => `
                <span class="tag text-xs">${tag} (${count})</span>
            `).join('');

        const timeline = report.timeline.map(item => {
            const mood = ProjectService.MOODS[item.mood] || ProjectService.MOODS.routine;
            return `
                <div class="flex gap-3 mb-3 pb-3 border-b border-stone-800 last:border-0">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center" style="background: ${mood.color}20">
                        ${mood.emoji}
                    </div>
                    <div class="flex-1">
                        <p class="text-sm font-medium text-white">${item.title}</p>
                        <p class="text-xs text-stone-500">${item.date}</p>
                        ${item.preview ? `<p class="text-xs text-stone-400 mt-1 line-clamp-2">${item.preview}</p>` : ''}
                    </div>
                </div>
            `;
        }).join('') || '<p class="text-stone-500 text-sm">Нет ключевых событий за период</p>';

        const insights = report.insights.map(i => `
            <div class="flex items-start gap-2 mb-2">
                <span class="text-primary">💡</span>
                <p class="text-sm text-stone-300">${i}</p>
            </div>
        `).join('');

        return `
            <div class="space-y-6">
                <!-- Статистика -->
                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-card rounded-xl p-4 text-center">
                        <p class="text-3xl font-bold text-primary">${report.total}</p>
                        <p class="text-xs text-stone-500">Всего записей</p>
                    </div>
                    <div class="bg-card rounded-xl p-4 text-center">
                        <p class="text-3xl font-bold text-secondary">${report.recent}</p>
                        <p class="text-xs text-stone-500">За выбранный период</p>
                    </div>
                </div>

                <!-- Настроения -->
                <div class="bg-card rounded-xl p-4">
                    <h4 class="text-sm font-semibold text-white mb-3">Распределение настроений</h4>
                    ${moodBars || '<p class="text-stone-500 text-sm">Нет данных</p>'}
                </div>

                <!-- Топ тегов -->
                ${topTags ? `
                    <div class="bg-card rounded-xl p-4">
                        <h4 class="text-sm font-semibold text-white mb-3">Популярные теги</h4>
                        <div class="flex flex-wrap gap-2">${topTags}</div>
                    </div>
                ` : ''}

                <!-- Таймлайн -->
                <div class="bg-card rounded-xl p-4">
                    <h4 class="text-sm font-semibold text-white mb-3">Ключевые события</h4>
                    ${timeline}
                </div>

                <!-- Инсайты -->
                ${insights ? `
                    <div class="bg-card rounded-xl p-4 border border-primary/30">
                        <h4 class="text-sm font-semibold text-white mb-3">Инсайты</h4>
                        ${insights}
                    </div>
                ` : ''}
            </div>
        `;
    },

    // Рендер еженедельного дайджеста
    renderWeeklyDigest(digest) {
        if (digest.projects.length === 0) {
            return `
                <div class="text-center py-8">
                    <p class="text-stone-500">За последнюю неделю нет активности в проектах</p>
                    <p class="text-stone-600 text-sm mt-2">Создайте запись с привязкой к проекту</p>
                </div>
            `;
        }

        const projects = digest.projects.map(p => `
            <div class="bg-card rounded-xl p-4 mb-3">
                <div class="flex items-center gap-2 mb-2">
                    <div class="w-3 h-3 rounded-full" style="background: ${p.color}"></div>
                    <h4 class="font-semibold text-white">${p.name}</h4>
                </div>
                <div class="flex gap-4 text-sm text-stone-400 mb-2">
                    <span>📝 ${p.entries} записей</span>
                    ${p.breakthroughs ? `<span>🔥 ${p.breakthroughs} прорывов</span>` : ''}
                    ${p.blockers ? `<span>🚧 ${p.blockers} блокеров</span>` : ''}
                </div>
                ${p.topTags.length ? `
                    <div class="flex flex-wrap gap-1">
                        ${p.topTags.map(t => `<span class="tag text-xs">${t}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        `).join('');

        return `
            <div>
                <p class="text-xs text-stone-500 mb-4">${digest.weekStart} — ${digest.weekEnd}</p>
                ${projects}
            </div>
        `;
    }
};

window.UIReports = UIReports;
