function applyTheme(theme) {
    document.documentElement.className = theme === 'light' ? '' : theme;
    localStorage.setItem('trivia_theme', theme);
}

function initializeThemeSwitcher() {
    const switcher = document.getElementById('theme-switcher');
    if (!switcher) return;

    // Convert labels into buttons for better styling
    switcher.querySelectorAll('label').forEach(label => {
        const radio = label.querySelector('input');
        const span = document.createElement('span');
        span.textContent = label.textContent; // Move the emoji to the span
        label.textContent = '';
        label.appendChild(radio);
        label.appendChild(span);
    });

    // Set the active button based on the saved theme
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

// Initialize after the DOM has loaded
document.addEventListener('DOMContentLoaded', initializeThemeSwitcher);