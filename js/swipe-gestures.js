// swipe-gestures.js - Touch swipe для карточек
// Влево = удалить, Вправо = проект

const SwipeGestures = {
    cards: new Map(),

    init(container) {
        // Навешиваем обработчики на все карточки
        this.bindCards();

        // Observers для новых карточек
        const observer = new MutationObserver(() => this.bindCards());
        observer.observe(container, { childList: true, subtree: true });
    },

    bindCards() {
        document.querySelectorAll('.memory-card:not([data-swipe-bound])').forEach(card => {
            card.setAttribute('data-swipe-bound', 'true');
            this.setupSwipe(card);
        });
    },

    setupSwipe(card) {
        let startX = 0;
        let currentX = 0;
        let startTime = 0;
        const THRESHOLD = 80; // px для активации
        const MAX_SWIPE = 160;

        card.addEventListener('touchstart', (e) => {
            // Не перехватываем если это кнопка внутри карточки
            if (e.target.closest('button, input, select, textarea')) return;
            
            startX = e.touches[0].clientX;
            startTime = Date.now();
            currentX = 0;
            card.style.transition = 'none';
        }, { passive: true });

        card.addEventListener('touchmove', (e) => {
            if (e.target.closest('button, input, select, textarea')) return;
            
            currentX = e.touches[0].clientX - startX;
            
            // Не позволяем свайпить в обе стороны сразу
            if (Math.abs(currentX) > 5) {
                e.preventDefault(); // Предотвращаем scroll
                const clamped = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, currentX));
                card.style.transform = `translateX(${clamped}px)`;
                
                // Показываем overlay
                this.showSwipeOverlay(card, clamped);
            }
        }, { passive: false });

        card.addEventListener('touchend', () => {
            card.style.transition = 'transform 0.3s ease-out';

            if (currentX < -THRESHOLD) {
                // Swipe left — confirm delete
                card.style.transform = `translateX(-${MAX_SWIPE}px)`;
                card.style.transition = 'transform 0.3s ease-out';
                
                // Auto-delete after 1.5s if not undone
                card.dataset.pendingDelete = 'true';
                this.showUndoButton(card);
                
                setTimeout(() => {
                    if (card.dataset.pendingDelete === 'true') {
                        const id = card.dataset.id;
                        if (id && typeof App !== 'undefined') {
                            App.currentMemory = { id };
                            App.deleteMemory();
                        }
                    }
                }, 1500);
                
            } else if (currentX > THRESHOLD) {
                // Swipe right — show project picker
                card.style.transform = `translateX(${MAX_SWIPE}px)`;
                this.showProjectSwitcher(card);
                
            } else {
                // Reset
                card.style.transform = '';
                this.hideOverlays(card);
            }
        });
    },

    showSwipeOverlay(card, offsetX) {
        let overlay = card.querySelector('.swipe-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'swipe-overlay absolute inset-0 rounded-2xl pointer-events-none flex items-center justify-between px-4 transition-opacity duration-150';
            card.appendChild(overlay);
        }

        overlay.style.opacity = Math.min(1, Math.abs(offsetX) / 120);
        
        if (offsetX < 0) {
            overlay.style.background = 'linear-gradient(to right, transparent, rgba(220, 38, 38, 0.3))';
            overlay.innerHTML = `<span class="text-white font-medium">🗑️ Удалить</span><span></span>`;
        } else {
            overlay.style.background = 'linear-gradient(to left, transparent, rgba(37, 99, 235, 0.3))';
            overlay.innerHTML = `<span></span><span class="text-white font-medium">📁 Проект →</span>`;
        }
    },

    showUndoButton(card) {
        let undo = card.querySelector('.undo-btn');
        if (undo) return;

        undo = document.createElement('button');
        undo.className = 'undo-btn absolute bottom-3 right-3 bg-white text-red-600 px-4 py-2 rounded-lg font-medium text-sm z-10 shadow-lg active:scale-95';
        undo.textContent = 'Отмена';
        undo.style.pointerEvents = 'auto';
        undo.addEventListener('click', (e) => {
            e.stopPropagation();
            card.dataset.pendingDelete = 'false';
            card.style.transition = 'transform 0.3s ease-out';
            card.style.transform = '';
            this.hideOverlays(card);
            if (undo.parentNode) undo.parentNode.removeChild(undo);
        });
        card.appendChild(undo);
    },

    showProjectSwitcher(card) {
        let picker = card.querySelector('.project-picker-mini');
        if (picker) {
            picker.style.opacity = '1';
            return;
        }

        // Простой picker — показывает проекты в виде overlay
        picker = document.createElement('div');
        picker.className = 'project-picker-mini absolute bottom-0 left-0 right-0 bg-card dark:bg-white rounded-t-2xl p-3 z-10 shadow-xl';
        picker.style.pointerEvents = 'auto';

        const projects = App?.projects || [];
        let html = '<div class="flex flex-wrap gap-2">';
        html += `<button class="mini-project-pill px-3 py-1.5 rounded-full text-xs bg-darker dark:bg-stone-200 text-stone-400 dark:text-stone-600 border border-stone-700 dark:border-stone-300" data-project="">Без проекта</button>`;
        
        projects.forEach(p => {
            html += `<button class="mini-project-pill px-3 py-1.5 rounded-full text-xs bg-primary text-white" data-project="${p.id}">${p.name}</button>`;
        });
        html += '</div>';
        picker.innerHTML = html;

        picker.querySelectorAll('.mini-project-pill').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const memoryId = card.dataset.id;
                const projectId = btn.dataset.project || null;
                
                if (memoryId && typeof App !== 'undefined') {
                    const memory = await DB.get(memoryId);
                    if (memory) {
                        memory.projectId = projectId;
                        memory.updatedAt = Date.now();
                        await DB.update(memory);
                        await App.loadMemories();
                        App.filter();
                    }
                }
            });
        });

        card.appendChild(picker);
    },

    hideOverlays(card) {
        const overlays = card.querySelectorAll('.swipe-overlay, .undo-btn, .project-picker-mini');
        overlays.forEach(o => {
            if (o.parentNode) o.parentNode.removeChild(o);
        });
    }
};

window.SwipeGestures = SwipeGestures;
