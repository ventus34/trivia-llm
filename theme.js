function applyTheme(theme) {
    document.documentElement.className = theme === 'light' ? '' : theme;
    localStorage.setItem('trivia_theme', theme);
}

function initializeThemeSwitcher() {
    const switcher = document.getElementById('theme-switcher');
    if (!switcher) return;

    // Przekształcenie labeli w przyciski dla lepszej stylizacji
    switcher.querySelectorAll('label').forEach(label => {
        const radio = label.querySelector('input');
        const span = document.createElement('span');
        span.textContent = label.textContent; // Przenosimy emoji do spana
        label.textContent = '';
        label.appendChild(radio);
        label.appendChild(span);
    });

    // Ustawienie aktywnego przycisku na podstawie zapisanego motywu
    const savedTheme = localStorage.getItem('trivia_theme') || 'light';
    const currentRadio = switcher.querySelector(`input[value="${savedTheme}"]`);
    if (currentRadio) {
        currentRadio.checked = true;
    }

    switcher.addEventListener('change', (e) => {
        const selectedTheme = e.target.value;
        applyTheme(selectedTheme);
    });
}

// Inicjalizacja po załadowaniu DOM
document.addEventListener('DOMContentLoaded', initializeThemeSwitcher);