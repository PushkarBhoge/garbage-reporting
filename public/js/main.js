// Main JavaScript for Garbage Reporting System

// Language selector functionality
function initializeLanguageSelector() {
    const languageSelector = document.getElementById('languageSelector');
    if (languageSelector) {
        languageSelector.addEventListener('change', async function() {
            const selectedLanguage = this.value;
            try {
                const response = await fetch('/set-language', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ language: selectedLanguage })
                });
                if (response.ok) {
                    window.location.reload();
                }
            } catch (error) {
                console.error('Error setting language:', error);
            }
        });
    }
}

// Theme toggle functionality
function initializeTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    const currentTheme = localStorage.getItem('theme') || 'light';

    // Set initial theme
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon(currentTheme);

    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            const current = document.documentElement.getAttribute('data-theme');
            const newTheme = current === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(newTheme);
        });
    }

    function updateThemeIcon(theme) {
        if (themeIcon) {
            themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }
}

// Initialize theme when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeTheme();
        initializeLanguageSelector();
    });
} else {
    initializeTheme();
    initializeLanguageSelector();
}

document.addEventListener('DOMContentLoaded', function() {
    const imageInputs = document.querySelectorAll('input[type="file"]');
    imageInputs.forEach(input => {
        input.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                // Don't show image preview automatically
            }
        });
    });

    // Form validation
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            const requiredFields = form.querySelectorAll('[required]');
            let isValid = true;
            
            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    field.classList.add('is-invalid');
                    isValid = false;
                } else {
                    field.classList.remove('is-invalid');
                }
            });
            
            if (!isValid) {
                e.preventDefault();
                alert('Fill all required fields');
            }
        });
    });

    // Auto-hide alerts after 3 seconds
    const alerts = document.querySelectorAll('.alert-success[data-auto-hide], .alert-danger[data-auto-hide]');
    alerts.forEach(alert => {
        const alertKey = 'alert_shown_' + window.location.pathname;
        if (!sessionStorage.getItem(alertKey)) {
            sessionStorage.setItem(alertKey, 'true');
            setTimeout(() => {
                alert.style.transition = 'opacity 0.5s ease';
                alert.style.opacity = '0';
                setTimeout(() => alert.remove(), 500);
            }, 3000);
        } else {
            alert.style.display = 'none';
        }
    });

    // Confirm delete actions - REMOVED to prevent double confirm dialogs
});

// Utility functions
function showSpinner(button) {
    const spinner = button.querySelector('.spinner');
    if (spinner) {
        spinner.style.display = 'inline-block';
    }
    button.disabled = true;
}

function hideSpinner(button) {
    const spinner = button.querySelector('.spinner');
    if (spinner) {
        spinner.style.display = 'none';
    }
    button.disabled = false;
}

// Method override for PUT and DELETE requests
function methodOverride(form, method) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = '_method';
    input.value = method;
    form.appendChild(input);
}