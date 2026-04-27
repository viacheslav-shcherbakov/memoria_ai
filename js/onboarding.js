// onboarding.js - Управление onboarding flow

const Onboarding = {
    currentScreen: 1,
    totalScreens: 3,
    
    init() {
        // Проверяем, проходил ли пользователь onboarding
        const completed = localStorage.getItem('memoria-onboarding-completed');
        
        if (completed) {
            this.showApp();
        } else {
            this.showOnboarding();
        }
        
        this.setupEventListeners();
    },
    
    setupEventListeners() {
        // Next buttons
        document.querySelectorAll('.onboarding-next').forEach(btn => {
            btn.addEventListener('click', () => this.next());
        });
        
        // Prev buttons
        document.querySelectorAll('.onboarding-prev').forEach(btn => {
            btn.addEventListener('click', () => this.prev());
        });
        
        // Finish button
        const finishBtn = document.getElementById('onboarding-finish');
        if (finishBtn) {
            finishBtn.addEventListener('click', () => this.complete());
        }
    },
    
    showOnboarding() {
        document.getElementById('onboarding').classList.remove('hidden');
        // Скрываем tab-views вместо несуществующего #app
        const tabViews = document.getElementById('tab-views');
        if (tabViews) tabViews.classList.add('opacity-0');
    },
    
    showApp() {
        const onboarding = document.getElementById('onboarding');
        onboarding.classList.add('hidden');
        onboarding.style.display = 'none';
        // Show the tab views
        const tabViews = document.getElementById('tab-views');
        if (tabViews) tabViews.classList.remove('hidden');
    },
    
    next() {
        if (this.currentScreen < this.totalScreens) {
            this.goToScreen(this.currentScreen + 1);
        }
    },
    
    prev() {
        if (this.currentScreen > 1) {
            this.goToScreen(this.currentScreen - 1);
        }
    },
    
    goToScreen(screenNum) {
        // Hide current
        document.querySelector(`.onboarding-screen[data-screen="${this.currentScreen}"]`).classList.add('hidden');
        document.querySelector(`.onboarding-dot[data-screen="${this.currentScreen}"]`).classList.remove('bg-primary');
        document.querySelector(`.onboarding-dot[data-screen="${this.currentScreen}"]`).classList.add('bg-stone-600');
        
        // Show new
        this.currentScreen = screenNum;
        document.querySelector(`.onboarding-screen[data-screen="${this.currentScreen}"]`).classList.remove('hidden');
        document.querySelector(`.onboarding-dot[data-screen="${this.currentScreen}"]`).classList.add('bg-primary');
        document.querySelector(`.onboarding-dot[data-screen="${this.currentScreen}"]`).classList.remove('bg-stone-600');
    },
    
    complete() {
        localStorage.setItem('memoria-onboarding-completed', 'true');
        
        // Анимация исчезновения
        const onboarding = document.getElementById('onboarding');
        onboarding.style.transition = 'opacity 0.5s ease';
        onboarding.style.opacity = '0';
        
        setTimeout(() => {
            this.showApp();
        }, 500);
    },
    
    // Сброс onboarding (для тестирования)
    reset() {
        localStorage.removeItem('memoria-onboarding-completed');
        location.reload();
    }
};

window.Onboarding = Onboarding;

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    Onboarding.init();
});
