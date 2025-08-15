const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// Global variables
let apps = [];
let filteredApps = [];
let currentTheme = 'classic-dark';
let appStatuses = {}; // Store status for all managed apps
let eventListenersSetup = false; // Prevent duplicate event listeners
let rainbowAnimationId = null;
let currentTab = 'apps'; // Track current active tab

// Theme definitions
const THEMES = {
    'classic-dark': {
        name: 'Classic Dark',
        description: 'Deep black theme with orange accents',
        icon: 'fas fa-moon',
        category: 'dark',
        '--primary-color': '#ff6b35',
        '--primary-dark': '#e55a2b',
        '--primary-darker': '#cc4a1f',
        '--primary-rgb': '255, 107, 53',
        '--warning-color': '#ff9800',
        '--warning-rgb': '255, 152, 0',
        '--background-dark': '#0f0f0f',
        '--background-light': '#1a1a1a',
        '--background-card': '#252525',
        '--border-color': '#333333',
        '--hover-color': '#2a2a2a',
        '--background-content': '#1a1a1a',
    },
    'modern-gray': {
        name: 'Modern Gray',
        description: 'Sleek gray theme with warm accents',
        icon: 'fas fa-desktop',
        category: 'dark',
        '--primary-color': '#ff6b35',
        '--primary-dark': '#e55a2b',
        '--primary-darker': '#cc4a1f',
        '--primary-rgb': '255, 107, 53',
        '--warning-color': '#ff6b35',
        '--warning-rgb': '255, 107, 53',
        '--background-dark': '#1c1c1e',
        '--background-light': '#2c2c2e',
        '--background-card': '#3a3a3c',
        '--border-color': '#444444',
        '--hover-color': '#4f4f52',
        '--background-content': '#2c2c2e',
    },
    'ocean-blue': {
        name: 'Ocean Blue',
        description: 'Cool blue theme inspired by the ocean',
        icon: 'fas fa-water',
        category: 'blue',
        '--primary-color': '#2196f3',
        '--primary-dark': '#1976d2',
        '--primary-darker': '#1565c0',
        '--primary-rgb': '33, 150, 243',
        '--warning-color': '#2196f3',
        '--warning-rgb': '33, 150, 243',
        '--background-dark': '#0d1421',
        '--background-light': '#1a2332',
        '--background-card': '#253244',
        '--border-color': '#334155',
        '--hover-color': '#3f4f5f',
        '--background-content': '#1a2332',
    },
    'forest-green': {
        name: 'Forest Green',
        description: 'Natural green theme with earthy tones',
        icon: 'fas fa-leaf',
        category: 'green',
        '--primary-color': '#43a047',
        '--primary-dark': '#388e3c',
        '--primary-darker': '#2e7d32',
        '--primary-rgb': '67, 160, 71',
        '--warning-color': '#43a047',
        '--warning-rgb': '67, 160, 71',
        '--background-dark': '#0f1b0f',
        '--background-light': '#1a2e1a',
        '--background-card': '#254025',
        '--border-color': '#335533',
        '--hover-color': '#2f4f2f',
        '--background-content': '#1a2e1a',
    },
    'royal-purple': {
        name: 'Royal Purple',
        description: 'Elegant purple theme with luxury feel',
        icon: 'fas fa-crown',
        category: 'purple',
        '--primary-color': '#9c27b0',
        '--primary-dark': '#7b1fa2',
        '--primary-darker': '#6a1b9a',
        '--primary-rgb': '156, 39, 176',
        '--warning-color': '#9c27b0',
        '--warning-rgb': '156, 39, 176',
        '--background-dark': '#1a0f1b',
        '--background-light': '#2e1a2f',
        '--background-card': '#402540',
        '--border-color': '#553355',
        '--hover-color': '#4f2f4f',
        '--background-content': '#2e1a2f',
    },
    'crimson-red': {
        name: 'Crimson Red',
        description: 'Bold red theme with high energy',
        icon: 'fas fa-fire',
        category: 'red',
        '--primary-color': '#f44336',
        '--primary-dark': '#d32f2f',
        '--primary-darker': '#c62828',
        '--primary-rgb': '244, 67, 54',
        '--warning-color': '#f44336',
        '--warning-rgb': '244, 67, 54',
        '--background-dark': '#1b0f0f',
        '--background-light': '#2f1a1a',
        '--background-card': '#402525',
        '--border-color': '#553333',
        '--hover-color': '#4f2f2f',
        '--background-content': '#2f1a1a',
    },
    'teal-mint': {
        name: 'Teal Mint',
        description: 'Fresh teal theme with mint accents',
        icon: 'fas fa-spa',
        category: 'teal',
        '--primary-color': '#009688',
        '--primary-dark': '#00796b',
        '--primary-darker': '#00695c',
        '--primary-rgb': '0, 150, 136',
        '--warning-color': '#009688',
        '--warning-rgb': '0, 150, 136',
        '--background-dark': '#0f1b1a',
        '--background-light': '#1a2e2c',
        '--background-card': '#25403e',
        '--border-color': '#335550',
        '--hover-color': '#2f4f4c',
        '--background-content': '#1a2e2c',
    },
    'sunset-orange': {
        name: 'Sunset Orange',
        description: 'Warm orange theme like a beautiful sunset',
        icon: 'fas fa-sun',
        category: 'orange',
        '--primary-color': '#ff9800',
        '--primary-dark': '#f57c00',
        '--primary-darker': '#ef6c00',
        '--primary-rgb': '255, 152, 0',
        '--warning-color': '#ff9800',
        '--warning-rgb': '255, 152, 0',
        '--background-dark': '#1b1509',
        '--background-light': '#2f2a1a',
        '--background-card': '#403e25',
        '--border-color': '#555533',
        '--hover-color': '#4f4d2f',
        '--background-content': '#2f2a1a',
    },
    'midnight-blue': {
        name: 'Midnight Blue',
        description: 'Deep blue theme for late night work',
        icon: 'fas fa-moon',
        category: 'blue',
        '--primary-color': '#3f51b5',
        '--primary-dark': '#303f9f',
        '--primary-darker': '#283593',
        '--primary-rgb': '63, 81, 181',
        '--warning-color': '#3f51b5',
        '--warning-rgb': '63, 81, 181',
        '--background-dark': '#0f1019',
        '--background-light': '#1a1d2e',
        '--background-card': '#252a40',
        '--border-color': '#333855',
        '--hover-color': '#2f354f',
        '--background-content': '#1a1d2e',
    },
    custom: {},
};

// Parse version string to extract numeric and text parts
function parseVersion(version) {
    if (!version) return { parts: [], suffix: '' };

    // Normalize separators (treat hyphens as part of suffix)
    const normalized = version.replace(/-/g, '');

    // Split by dots and process each part
    const parts = normalized.split('.').map(part => {
        // Extract numeric part from each segment
        const match = part.match(/^(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
    });

    // Extract suffix from the last part (e.g., "wb" from "0.3.8wb" or "0.3.8-wb")
    const lastPart = normalized.split('.').pop();
    const suffixMatch = lastPart.match(/\d+(.+)$/);
    const suffix = suffixMatch ? suffixMatch[1] : '';

    return { parts, suffix };
}

// Compare version strings (returns -1, 0, or 1)
function compareVersions(version1, version2) {
    if (!version1 || !version2) return 0;

    const v1 = parseVersion(version1);
    const v2 = parseVersion(version2);

    const maxLength = Math.max(v1.parts.length, v2.parts.length);

    // Compare numeric parts first
    for (let i = 0; i < maxLength; i++) {
        const v1part = v1.parts[i] || 0;
        const v2part = v2.parts[i] || 0;

        if (v1part < v2part) return -1;
        if (v1part > v2part) return 1;
    }

    // If numeric parts are equal, compare suffixes
    if (v1.suffix !== v2.suffix) {
        // No suffix is considered "higher" than with suffix
        if (!v1.suffix && v2.suffix) return 1;
        if (v1.suffix && !v2.suffix) return -1;

        // Compare suffixes alphabetically
        if (v1.suffix < v2.suffix) return -1;
        if (v1.suffix > v2.suffix) return 1;
    }

    return 0;
}

// Check if app needs update
function needsUpdate(installedVersion, expectedVersion) {
    if (!installedVersion || installedVersion === 'unknown') {
        return true;
    }

    const comparison = compareVersions(installedVersion, expectedVersion);

    return comparison < 0;
}

// Auto-update variables
let autoUpdateInterval = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
    await loadApps();
    setupEventListeners();
    setupAutoUpdate();
    initTabSystem(); // Initialize the tab system
});

// Enhanced settings loading with advanced theme features
async function loadSettings() {
    try {
        // Load settings from JSON file via main process
        const settings = await ipcRenderer.invoke('load-settings');

        currentTheme = settings.theme || 'classic-dark';

        // Load custom theme if needed
        if (currentTheme === 'custom' && settings.customTheme) {
            THEMES['custom'] = settings.customTheme;
            loadCustomTheme();
        }
        applyTheme(currentTheme);

        // Load rainbow mode settings
        const rainbowMode = settings.rainbowMode || false;
        if (rainbowMode) {
            const rainbowSpeed = parseInt(settings.rainbowSpeed || '5');
            applyRainbowEffect(rainbowSpeed);
        } else {
            // Load primary color only if rainbow mode is off
            const savedPrimaryColor = settings.primaryColor || '#ff6b35';
            applyPrimaryColor(savedPrimaryColor);
        }

        // Generate theme presets after settings are loaded
        setTimeout(() => {
            generateThemePresets();
        }, 200);
    } catch (error) {

        // Fallback to localStorage for backward compatibility
        const savedTheme = localStorage.getItem('theme') || 'classic-dark';
        currentTheme = savedTheme;

        if (savedTheme === 'custom') {
            loadCustomTheme();
        }
        applyTheme(currentTheme);

        const rainbowMode = localStorage.getItem('rainbowMode') === 'true';
        if (rainbowMode) {
            const rainbowSpeed = parseInt(localStorage.getItem('rainbowSpeed') || '5');
            applyRainbowEffect(rainbowSpeed);
        } else {
            const savedPrimaryColor = localStorage.getItem('primaryColor') || '#ff6b35';
            applyPrimaryColor(savedPrimaryColor);
        }
    }

    // Clean up removed settings from localStorage
    localStorage.removeItem('autoLaunch');
    localStorage.removeItem('minimizeToTray');

    // Load behavior settings

    // Apply settings to UI elements when they exist
    setTimeout(() => {
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) {
            themeSelect.value = currentTheme;
        }

        const primaryColorPicker = document.getElementById('primary-color-picker');
        const primaryColorPreview = document.getElementById('primary-color-preview');
        if (primaryColorPicker && !rainbowMode) {
            const savedPrimaryColor = localStorage.getItem('primaryColor') || '#ff6b35';
            primaryColorPicker.value = savedPrimaryColor;
            if (primaryColorPreview) {
                primaryColorPreview.textContent = savedPrimaryColor;
            }
        }

        // Rainbow mode controls
        const rainbowModeCheckbox = document.getElementById('rainbow-mode-checkbox');
        if (rainbowModeCheckbox) {
            rainbowModeCheckbox.checked = rainbowMode;
        }

        const rainbowSpeedSlider = document.getElementById('rainbow-speed-slider');
        const rainbowSpeedValue = document.getElementById('rainbow-speed-value');
        if (rainbowSpeedSlider && rainbowSpeedValue) {
            const rainbowSpeed = parseInt(localStorage.getItem('rainbowSpeed') || '5');
            rainbowSpeedSlider.value = rainbowSpeed;
            rainbowSpeedValue.textContent = `${rainbowSpeed}s`;
        }
        toggleRainbowSpeedContainer(rainbowMode);



        // Generate theme presets if container exists
        setTimeout(() => {
            generateThemePresets();
        }, 200);
    }, 100);
}

function toggleRainbowSpeedContainer(enabled) {
    const container = document.getElementById('rainbow-speed-container');
    if (container) {
        container.style.display = enabled ? 'block' : 'none';
    }
}

// Enhanced settings saving with advanced theme features
async function saveSettings() {
    try {
        // Gather all settings
        const settings = {
            theme: currentTheme,
            primaryColor: document.getElementById('primary-color-picker')?.value || '#ff6b35',
            rainbowMode: document.getElementById('rainbow-mode-checkbox')?.checked || false,
            rainbowSpeed: parseInt(document.getElementById('rainbow-speed-slider')?.value || '5'),
            customTheme: THEMES['custom'] || {},
            autoUpdate: document.getElementById('auto-update-checkbox')?.checked || true,
            updateInterval: parseInt(document.getElementById('update-interval-select')?.value || '86400000')
        };

        // Save to JSON file via main process
        const success = await ipcRenderer.invoke('save-settings', settings);

        if (success) {
            // Also save to localStorage for backward compatibility
            localStorage.setItem('theme', settings.theme);
            localStorage.setItem('primaryColor', settings.primaryColor);
            localStorage.setItem('rainbowMode', settings.rainbowMode);
            localStorage.setItem('rainbowSpeed', settings.rainbowSpeed);
            if (settings.customTheme && Object.keys(settings.customTheme).length > 0) {
                localStorage.setItem('customTheme', JSON.stringify(settings.customTheme));
            }
        } else {
            throw new Error('Failed to save settings to file');
        }
    } catch (error) {

        // Fallback to localStorage
        localStorage.setItem('theme', currentTheme);

        const primaryColorPicker = document.getElementById('primary-color-picker');
        if (primaryColorPicker) {
            localStorage.setItem('primaryColor', primaryColorPicker.value);
        }

        const rainbowModeCheckbox = document.getElementById('rainbow-mode-checkbox');
        if (rainbowModeCheckbox) {
            localStorage.setItem('rainbowMode', rainbowModeCheckbox.checked);
        }

        const rainbowSpeedSlider = document.getElementById('rainbow-speed-slider');
        if (rainbowSpeedSlider) {
            localStorage.setItem('rainbowSpeed', rainbowSpeedSlider.value);
        }
    }
}

// Enhanced theme application function
function applyTheme(themeName) {
    const theme = THEMES[themeName];
    if (!theme) return;

    if (themeName === 'custom') {
        loadCustomTheme();
    } else {
        // Apply theme CSS variables
        for (const [key, value] of Object.entries(theme)) {
            if (key.startsWith('--')) {
                document.documentElement.style.setProperty(key, value);
            }
        }
    }

    currentTheme = themeName;

    // Update color picker if it exists
    const colorPicker = document.getElementById('primary-color-picker');
    const colorPreview = document.getElementById('primary-color-preview');
    if (colorPicker && colorPreview) {
        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color');
        colorPicker.value = primaryColor.trim();
        colorPreview.textContent = primaryColor.trim();
    }
}

// Apply primary color
// Enhanced primary color application with better color calculations
function applyPrimaryColor(color) {
    updatePrimaryColorVariables(color);
}

function updatePrimaryColorVariables(color) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    const darkerColor = darkenColor(color, 0.15);
    const darkestColor = darkenColor(color, 0.3);

    document.documentElement.style.setProperty('--primary-color', color);
    document.documentElement.style.setProperty('--primary-dark', darkerColor);
    document.documentElement.style.setProperty('--primary-darker', darkestColor);
    document.documentElement.style.setProperty('--primary-rgb', `${r}, ${g}, ${b}`);

    // Also update warning color to match primary color for consistent theming
    document.documentElement.style.setProperty('--warning-color', color);
    document.documentElement.style.setProperty('--warning-rgb', `${r}, ${g}, ${b}`);

    // Update color preview if it exists
    const colorPreview = document.getElementById('primary-color-preview');
    if (colorPreview) {
        colorPreview.textContent = color;
    }
}

function darkenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent * 100);
    const R = (num >> 16) - amt;
    const G = ((num >> 8) & 0x00ff) - amt;
    const B = (num & 0x0000ff) - amt;
    return (
        '#' +
        (
            0x1000000 +
            (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
            (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
            (B < 255 ? (B < 1 ? 0 : B) : 255)
        )
            .toString(16)
            .slice(1)
    );
}

// Rainbow effect functions
function hslToHex(h, s, l) {
    l /= 100;
    const a = (s * Math.min(l, 1 - l)) / 100;
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color)
            .toString(16)
            .padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

function applyRainbowEffect(speed = 5) {
    if (rainbowAnimationId) {
        cancelAnimationFrame(rainbowAnimationId);
    }

    let hue = 0;
    const cycleDuration = speed * 1000;
    let startTime = null;

    function updateRainbowColors(timestamp) {
        if (!startTime) startTime = timestamp;
        const elapsedTime = timestamp - startTime;

        hue = ((elapsedTime / cycleDuration) * 360) % 360;

        const colorHex = hslToHex(hue, 100, 50);
        updatePrimaryColorVariables(colorHex);

        rainbowAnimationId = requestAnimationFrame(updateRainbowColors);
    }

    rainbowAnimationId = requestAnimationFrame(updateRainbowColors);
}

function removeRainbowEffect() {
    if (rainbowAnimationId) {
        cancelAnimationFrame(rainbowAnimationId);
        rainbowAnimationId = null;
    }
}

// Custom theme functions
function loadCustomTheme() {
    // Try to get custom theme from THEMES object first (loaded from settings file)
    let customTheme = THEMES['custom'];

    // Fallback to localStorage if not found
    if (!customTheme || Object.keys(customTheme).length === 0) {
        customTheme = JSON.parse(localStorage.getItem('customTheme') || '{}');
        THEMES['custom'] = customTheme;
    }

    if (Object.keys(customTheme).length > 0) {
        for (const [key, value] of Object.entries(customTheme)) {
            if (key.startsWith('--')) {
                document.documentElement.style.setProperty(key, value);
            }
        }
    }
}

async function saveCustomTheme(themeData) {
    THEMES['custom'] = themeData;

    try {
        // Load current settings, update custom theme, and save
        const currentSettings = await ipcRenderer.invoke('load-settings');
        currentSettings.customTheme = themeData;
        await ipcRenderer.invoke('save-settings', currentSettings);

        // Also save to localStorage for backward compatibility
        localStorage.setItem('customTheme', JSON.stringify(themeData));
    } catch (error) {
        localStorage.setItem('customTheme', JSON.stringify(themeData));
    }
}

// Theme preset generation
function generateThemePresets() {
    const grid = document.getElementById('theme-presets-grid');
    if (!grid) return;

    grid.innerHTML = '';

    Object.entries(THEMES).forEach(([themeKey, theme]) => {
        // Skip empty custom theme
        if (themeKey === 'custom' && (!theme || Object.keys(theme).length === 0)) {
            return;
        }

        const card = document.createElement('div');
        card.className = 'theme-preset-card';
        card.dataset.theme = themeKey;

        // Create color dots for preview
        const colorDots = [
            theme['--primary-color'] || '#ff9800',
            theme['--background-card'] || '#3a3a3c',
            theme['--background-light'] || '#2c2c2e',
            theme['--border-color'] || '#444444'
        ].map(color => `<div class="theme-color-dot" style="background-color: ${color};"></div>`).join('');

        const isCustom = themeKey === 'custom';
        const categoryText = isCustom ? 'custom' : (theme.category || 'theme');

        card.innerHTML = `
            <div class="theme-preset-category">${categoryText}</div>
            <div class="theme-preset-header">
                <div class="theme-preset-icon" style="background-color: ${theme['--primary-color'] || '#ff9800'};">
                    <i class="${theme.icon || 'fas fa-palette'}"></i>
                </div>
                <div class="theme-preset-info">
                    <h5>${theme.name || themeKey}</h5>
                    <p>${theme.description || 'Custom theme preset'}</p>
                </div>
            </div>
            <div class="theme-preset-colors">
                ${colorDots}
            </div>
            ${isCustom ? '<div class="custom-theme-badge"><i class="fas fa-edit"></i></div>' : ''}
        `;

        card.addEventListener('click', () => selectThemePreset(themeKey));
        grid.appendChild(card);
    });

    updateActiveThemePreset();
}

async function selectThemePreset(themeKey) {
    applyTheme(themeKey);
    currentTheme = themeKey;

    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
        themeSelect.value = themeKey;
    }

    updateActiveThemePreset();

    // Save the theme selection
    try {
        await saveSettings();
    } catch (error) {
        // Fallback to localStorage
        localStorage.setItem('theme', themeKey);
    }
}

function updateActiveThemePreset() {
    const currentTheme = document.getElementById('theme-select')?.value || 'classic-dark';

    document.querySelectorAll('.theme-preset-card').forEach(card => {
        card.classList.remove('active');
    });

    const activeCard = document.querySelector(`[data-theme="${currentTheme}"]`);
    if (activeCard) {
        activeCard.classList.add('active');
    }
}

// Legacy function - now handled by setupSettingsControls
function changeTheme() {
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
        applyTheme(themeSelect.value);
        currentTheme = themeSelect.value;
        updateActiveThemePreset();
    }
}

// Load apps from GitHub JSON URL
async function loadApps() {
    try {
        showLoading(true);

        const appsJsonUrl = 'https://raw.githubusercontent.com/MTechWare/My-App/refs/heads/main/apps.json';

        // Fetch from GitHub URL
        const response = await fetch(appsJsonUrl);

        if (!response.ok) {
            throw new Error(`Failed to fetch apps.json: ${response.status} ${response.statusText}`);
        }

        const appsData = await response.json();

        apps = appsData.apps || [];
        filteredApps = [...apps];

        // Update expected WinTool version from JSON
        if (appsData.expectedWinToolVersion) {
            expectedWinToolVersion = appsData.expectedWinToolVersion;
        }

        populateCategories();
        renderApps();

        // Check status of managed apps after loading
        checkManagedAppsStatus();

    } catch (error) {
        // Fallback to local file if GitHub fetch fails
        try {
            const appsJsonPath = path.join(process.cwd(), 'apps.json');
            const data = fs.readFileSync(appsJsonPath, 'utf8');
            const appsData = JSON.parse(data);

            apps = appsData.apps || [];
            filteredApps = [...apps];

            if (appsData.expectedWinToolVersion) {
                expectedWinToolVersion = appsData.expectedWinToolVersion;
            }

            populateCategories();
            renderApps();
            showNotification('Apps loaded from local file (GitHub unavailable)', 'warning');

            // Check status of managed apps after loading
            checkManagedAppsStatus();
        } catch (fallbackError) {
            showNotification('Failed to load apps: ' + error.message, 'error');
            apps = [];
            filteredApps = [];
            renderApps();
        }
    } finally {
        showLoading(false);
    }
}

// Populate category filter
function populateCategories() {
    const categoryFilter = document.getElementById('category-filter');
    const categories = [...new Set(apps.map(app => app.category))].sort();

    // Clear existing options except "All Categories"
    categoryFilter.innerHTML = '<option value="">All Categories</option>';

    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });
}

// Filter apps based on search and category
function filterApps() {
    const searchTerm = document.getElementById('app-search').value.toLowerCase();
    const selectedCategory = document.getElementById('category-filter').value;

    filteredApps = apps.filter(app => {
        const matchesSearch = app.name.toLowerCase().includes(searchTerm) ||
            app.description.toLowerCase().includes(searchTerm) ||
            app.tags.some(tag => tag.toLowerCase().includes(searchTerm));

        const matchesCategory = !selectedCategory || app.category === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    renderApps();
}

// Render apps in the grid
function renderApps() {
    const appsGrid = document.getElementById('apps-grid');

    if (filteredApps.length === 0) {
        appsGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-secondary);">
                <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p>No apps found</p>
                <p style="font-size: 0.875rem; margin-top: 0.5rem;">Try adjusting your search or filters</p>
            </div>
        `;
        return;
    }

    appsGrid.innerHTML = filteredApps.map(app => {
        if (app.managed) {
            return renderManagedAppCard(app);
        } else {
            return renderRegularAppCard(app);
        }
    }).join('');
}

// Render regular app card (non-managed)
function renderRegularAppCard(app) {
    return `
        <div class="app-card" onclick="launchApp('${app.id}', '${app.path}', '${app.name}')">
            <div class="app-card-header">
                <div class="app-icon">
                    <i class="${app.icon}"></i>
                </div>
                <div class="app-info">
                    <h3>${app.name}</h3>
                    <div class="app-category">${app.category}</div>
                </div>
            </div>
            <div class="app-description">${app.description}</div>
            <div class="app-tags">
                ${app.tags.map(tag => `<span class="app-tag">${tag}</span>`).join('')}
            </div>
        </div>
    `;
}

// Render managed app card with install/uninstall options
function renderManagedAppCard(app) {
    const appStatus = appStatuses[app.id] || { installed: false, version: null };
    const isInstalled = appStatus.installed;
    const installedVersion = appStatus.version;
    const expectedVersion = app.version;
    const hasUpdate = isInstalled && needsUpdate(installedVersion, expectedVersion);

    let statusText = 'Not Installed';
    let statusClass = 'warning';
    let versionInfo = '';

    if (isInstalled) {
        if (hasUpdate) {
            statusText = 'Update Available';
            statusClass = 'warning';
            versionInfo = `<div class="version-info">
                <span class="version-current">v${installedVersion || 'unknown'}</span>
                <i class="fas fa-arrow-right"></i>
                <span class="version-latest">v${expectedVersion}</span>
            </div>`;
        } else {
            statusText = 'Up to Date';
            statusClass = 'success';
            versionInfo = `<div class="version-info">
                <span class="version-current">v${installedVersion || 'unknown'}</span>
            </div>`;
        }
    }

    return `
        <div class="app-card managed-app-card ${hasUpdate ? 'has-update' : ''}" data-app-id="${app.id}">
            <div class="app-card-header">
                <div class="app-icon">
                    <i class="${app.icon}"></i>
                </div>
                <div class="app-info">
                    <h3>${app.name}</h3>
                    <div class="app-category">${app.category}</div>
                    <div class="app-status ${statusClass}">${statusText}</div>
                    ${versionInfo}
                </div>
            </div>
            <div class="app-description">${app.description}</div>
            <div class="app-tags">
                ${app.tags.map(tag => `<span class="app-tag">${tag}</span>`).join('')}
            </div>
            <div class="app-actions">
                ${isInstalled ? `
                    <button class="btn btn-primary" onclick="event.stopPropagation(); launchApp('${app.id}', '${app.path}', '${app.name}')">
                        <i class="fas fa-play"></i> Launch
                    </button>
                    ${hasUpdate ? `
                        <button class="btn btn-update" onclick="event.stopPropagation(); updateApp('${app.id}')">
                            <i class="fas fa-sync-alt"></i> Update
                        </button>
                    ` : ''}
                    <button class="btn btn-uninstall" onclick="event.stopPropagation(); uninstallApp('${app.id}')">
                        <i class="fas fa-trash"></i> Uninstall
                    </button>
                ` : `
                    <button class="btn btn-primary" onclick="event.stopPropagation(); installApp('${app.id}')">
                        <i class="fas fa-download"></i> Install & Run${expectedVersion ? ` v${expectedVersion}` : ''}
                    </button>
                `}
            </div>
        </div>
    `;
}

// Check status of all managed apps
function checkManagedAppsStatus() {
    console.log(`Checking status for ${apps.length} apps`);
    apps.forEach(app => {
        if (app.managed) {
            console.log(`Checking status for managed app: ${app.id}`);
            ipcRenderer.send('check-app-status', app.id);
        }
    });
}

// Launch an application
function launchApp(appId, appPath, appName) {
    try {
        const app = apps.find(a => a.id === appId);
        if (app && app.managed) {
            const appStatus = appStatuses[appId];
            if (!appStatus || !appStatus.installed) {
                showInstallDialog(appId, appName);
                return;
            }
        }

        // Show progress overlay only
        showProgressOverlay(appId, 'launching', appName);
        showNotification(`Launching ${appName}...`, 'info');
        ipcRenderer.send('launch-app', appId, appPath);

        // Remove overlay after 2 seconds
        setTimeout(() => {
            hideProgressOverlay(appId);
            clearProgressInterval(appId);
        }, 2000);
    } catch (error) {
        showNotification(`Failed to launch ${appName}`, 'error');
        hideProgressOverlay(appId);
        clearProgressInterval(appId);
        addCardAnimation(appId, 'error');
        setTimeout(() => removeCardAnimation(appId, 'error'), 1000);
    }
}

// Show install dialog for any app
function showInstallDialog(appId, appName) {
    const app = apps.find(a => a.id === appId);
    if (!app) return;

    const installDialog = document.createElement('div');
    installDialog.className = 'modal-overlay';
    installDialog.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h2><i class="${app.icon}"></i> ${appName} Not Installed</h2>
            </div>
            <div class="modal-body">
                <p>${appName} is not installed on your system.</p>
                <p>Would you like to download and install it now?</p>
                ${app.installPath ? `
                    <div style="margin-top: 1rem;">
                        <strong>Installation path:</strong><br>
                        <code>${app.installPath}</code>
                    </div>
                ` : ''}
            </div>
            <div class="modal-footer">
                <button class="btn" onclick="closeInstallDialog()">Cancel</button>
                <button class="btn btn-primary" onclick="confirmInstall('${appId}')">
                    <i class="fas fa-download"></i> Install ${appName}
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(installDialog);
}

// Close install dialog
function closeInstallDialog() {
    const dialog = document.querySelector('.modal-overlay');
    if (dialog) {
        dialog.remove();
    }
}

// Confirm install from dialog
function confirmInstall(appId) {
    closeInstallDialog();
    installApp(appId);
}

// Install app
function installApp(appId) {
    const app = apps.find(a => a.id === appId);
    if (!app) return;

    closeInstallDialog();

    // Show progress overlay only
    showProgressOverlay(appId, 'installing', app.name);
    addButtonLoadingState(appId, 'install');

    ipcRenderer.send('install-app', appId);
}

// Update app
function updateApp(appId) {
    const app = apps.find(a => a.id === appId);
    if (!app) return;

    if (confirm(`This will download and install the latest version of ${app.name}. Continue?`)) {
        // Show progress overlay only
        showProgressOverlay(appId, 'updating', app.name);
        addButtonLoadingState(appId, 'update');

        ipcRenderer.send('update-app', appId);
    }
}

// Uninstall app
function uninstallApp(appId) {
    const app = apps.find(a => a.id === appId);
    if (!app) return;

    if (confirm(`Are you sure you want to uninstall ${app.name}?`)) {
        // Show progress overlay only
        showProgressOverlay(appId, 'uninstalling', app.name);
        addButtonLoadingState(appId, 'uninstall');

        showNotification(`Uninstalling ${app.name}...`, 'info');
        ipcRenderer.send('uninstall-app', appId);
    }
}

// Show/hide loading overlay
function showLoading(show) {
    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.style.display = show ? 'flex' : 'none';
}

// Show notification
function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;

    container.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// Get notification icon based on type
function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'warning': return 'fa-exclamation-triangle';
        case 'info': return 'fa-info-circle';
        default: return 'fa-info-circle';
    }
}

// Setup event listeners
function setupEventListeners() {
    if (eventListenersSetup) {
        return;
    }

    eventListenersSetup = true;

    // Handle app launch errors
    ipcRenderer.on('app-launch-error', (event, error) => {
        showNotification(`Launch failed: ${error}`, 'error');
    });

    // Handle app status updates
    ipcRenderer.on('app-status', (event, status) => {
        appStatuses[status.appId] = status;
        renderApps(); // Re-render to update buttons
    });

    // Handle app not installed
    ipcRenderer.on('app-not-installed', (event, appId) => {
        const app = apps.find(a => a.id === appId);
        if (app) {
            showInstallDialog(appId, app.name);
        }
    });

    // Handle app installation progress
    ipcRenderer.on('app-installing', (event, appId) => {
        const app = apps.find(a => a.id === appId);
        showNotification(`Installing ${app ? app.name : appId}...`, 'info');
    });

    // Handle app installation success
    ipcRenderer.on('app-installed', (event, appId) => {
        const app = apps.find(a => a.id === appId);

        // Clear progress and show success state
        clearProgressInterval(appId);
        hideProgressOverlay(appId);
        removeButtonLoadingState(appId);
        addCardAnimation(appId, 'success');

        showNotification(`${app ? app.name : appId} installed successfully!`, 'success');
        ipcRenderer.send('check-app-status', appId); // Refresh status - this will trigger renderApps() via app-status event

        // Remove success state after 1 second
        setTimeout(() => removeCardAnimation(appId, 'success'), 1000);
    });

    // Handle app installation error
    ipcRenderer.on('app-install-error', (event, appId, error) => {
        const app = apps.find(a => a.id === appId);

        // Clear progress and show error state
        clearProgressInterval(appId);
        hideProgressOverlay(appId);
        removeButtonLoadingState(appId);
        addCardAnimation(appId, 'error');

        showNotification(`Installation of ${app ? app.name : appId} failed: ${error}`, 'error');

        // Remove error state after 1 second
        setTimeout(() => removeCardAnimation(appId, 'error'), 1000);
    });

    // Handle app update progress
    ipcRenderer.on('app-updating', (event, appId) => {
        const app = apps.find(a => a.id === appId);
        showNotification(`Updating ${app ? app.name : appId}...`, 'info');
    });

    // Handle app update success
    ipcRenderer.on('app-updated', (event, appId) => {
        const app = apps.find(a => a.id === appId);

        // Clear progress and show success state
        clearProgressInterval(appId);
        hideProgressOverlay(appId);
        removeButtonLoadingState(appId);
        addCardAnimation(appId, 'success');

        showNotification(`${app ? app.name : appId} updated successfully!`, 'success');
        ipcRenderer.send('check-app-status', appId); // Refresh status - this will trigger renderApps() via app-status event

        // Remove success state after 1 second
        setTimeout(() => removeCardAnimation(appId, 'success'), 1000);
    });

    // Handle app update error
    ipcRenderer.on('app-update-error', (event, appId, error) => {
        const app = apps.find(a => a.id === appId);

        // Clear progress and show error state
        clearProgressInterval(appId);
        hideProgressOverlay(appId);
        removeButtonLoadingState(appId);
        addCardAnimation(appId, 'error');

        showNotification(`Update of ${app ? app.name : appId} failed: ${error}`, 'error');

        // Remove error state after 1 second
        setTimeout(() => removeCardAnimation(appId, 'error'), 1000);
    });

    // Handle app uninstallation success
    ipcRenderer.on('app-uninstalled', (event, appId) => {
        const app = apps.find(a => a.id === appId);

        // Clear progress and show success state
        clearProgressInterval(appId);
        hideProgressOverlay(appId);
        removeButtonLoadingState(appId);
        addCardAnimation(appId, 'success');

        showNotification(`${app ? app.name : appId} uninstalled successfully!`, 'success');
        ipcRenderer.send('check-app-status', appId); // Refresh status - this will trigger renderApps() via app-status event

        // Remove success state after 1 second
        setTimeout(() => removeCardAnimation(appId, 'success'), 1000);
    });

    // Handle app uninstallation error
    ipcRenderer.on('app-uninstall-error', (event, appId, error) => {
        const app = apps.find(a => a.id === appId);

        // Clear progress and show error state
        clearProgressInterval(appId);
        hideProgressOverlay(appId);
        removeButtonLoadingState(appId);
        addCardAnimation(appId, 'error');

        showNotification(`Uninstallation of ${app ? app.name : appId} failed: ${error}`, 'error');

        // Remove error state after 1 second
        setTimeout(() => removeCardAnimation(appId, 'error'), 1000);
    });

    // Window control event listeners
    const minimizeBtn = document.getElementById('minimize-btn');
    const maximizeBtn = document.getElementById('maximize-btn');
    const closeBtn = document.getElementById('close-btn');

    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', minimizeWindow);
    }
    if (maximizeBtn) {
        maximizeBtn.addEventListener('click', toggleMaximize);
    }
    if (closeBtn) {
        closeBtn.addEventListener('click', closeWindow);
    }
}

// Window control functions
function minimizeWindow() {
    ipcRenderer.send('window-minimize');
}

function toggleMaximize() {
    ipcRenderer.send('window-maximize');
}

function closeWindow() {
    ipcRenderer.send('window-close');
}

// Navigation functions
function showSection(sectionName) {
    // Update navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

    // Update content sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(`${sectionName}-section`).classList.add('active');
}

// Settings modal functions
function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    modal.style.display = 'flex';

    // Load settings file path
    loadSettingsPath();

    // Setup settings navigation
    setupSettingsNavigation();

    // Add click outside to close
    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            closeSettingsModal();
        }
    });

    // Add escape key to close
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeSettingsModal();
        }
    });
}

function closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    modal.style.display = 'none';
}

function setupSettingsNavigation() {
    const navItems = document.querySelectorAll('.settings-nav-item');
    const panels = document.querySelectorAll('.settings-panel');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetTab = item.getAttribute('data-settings-tab');

            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Update active panel
            panels.forEach(panel => panel.classList.remove('active'));
            const targetPanel = document.getElementById(`settings-${targetTab}`);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        });
    });

    // Setup settings control event listeners
    setupSettingsControls();
}

function setupSettingsControls() {
    // Theme selector
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
        themeSelect.addEventListener('change', (e) => {
            const selectedTheme = e.target.value;
            applyTheme(selectedTheme);
            currentTheme = selectedTheme;
            updateActiveThemePreset();
        });
    }

    // Primary color picker
    const primaryColorPicker = document.getElementById('primary-color-picker');
    const primaryColorPreview = document.getElementById('primary-color-preview');
    if (primaryColorPicker && primaryColorPreview) {
        primaryColorPicker.addEventListener('input', (e) => {
            const color = e.target.value;
            primaryColorPreview.textContent = color;
            updatePrimaryColorVariables(color);
        });
    }

    // Rainbow mode controls
    const rainbowModeCheckbox = document.getElementById('rainbow-mode-checkbox');
    if (rainbowModeCheckbox) {
        rainbowModeCheckbox.addEventListener('change', (e) => {
            const enabled = e.target.checked;
            toggleRainbowSpeedContainer(enabled);
            if (enabled) {
                const rainbowSpeed = document.getElementById('rainbow-speed-slider')?.value || 5;
                applyRainbowEffect(rainbowSpeed);
            } else {
                removeRainbowEffect();
                const primaryColor = document.getElementById('primary-color-picker')?.value || '#ff6b35';
                updatePrimaryColorVariables(primaryColor);
            }
        });
    }

    const rainbowSpeedSlider = document.getElementById('rainbow-speed-slider');
    const rainbowSpeedValue = document.getElementById('rainbow-speed-value');
    if (rainbowSpeedSlider && rainbowSpeedValue) {
        rainbowSpeedSlider.addEventListener('input', (e) => {
            const speed = e.target.value;
            rainbowSpeedValue.textContent = `${speed}s`;

            if (rainbowAnimationId) {
                applyRainbowEffect(speed);
            }
        });
    }

    // Auto-update checkbox
    const autoUpdateCheckbox = document.getElementById('auto-update-checkbox');
    if (autoUpdateCheckbox) {
        autoUpdateCheckbox.addEventListener('change', async (e) => {
            if (e.target.checked) {
                const settings = await ipcRenderer.invoke('load-settings');
                const updateInterval = settings.updateInterval || 86400000;

                showNotification('Auto-update enabled - checking for updates...', 'info');

                // Check for updates immediately
                await checkForUpdatesNow();

                // Then start the timer for future checks
                startAutoUpdateTimer(updateInterval);
            } else {
                stopAutoUpdateTimer();
                showNotification('Auto-update disabled', 'info');
            }
        });
    }

    // Update interval select
    const updateIntervalSelect = document.getElementById('update-interval-select');
    if (updateIntervalSelect) {
        updateIntervalSelect.addEventListener('change', async (e) => {
            const newInterval = parseInt(e.target.value);
            const settings = await ipcRenderer.invoke('load-settings');

            if (settings.autoUpdate) {
                startAutoUpdateTimer(newInterval);
                showNotification('Update interval changed', 'success');
            }
        });
    }

    // Load current settings into controls
    loadSettingsIntoControls().catch(error => {
        // Failed to load settings into controls
    });
}

async function loadSettingsIntoControls() {
    try {
        // Load settings from file
        const settings = await ipcRenderer.invoke('load-settings');

        // Load theme
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) {
            themeSelect.value = settings.theme || 'classic-dark';
        }

        // Load primary color
        const savedPrimaryColor = settings.primaryColor || '#ff6b35';
        const primaryColorPicker = document.getElementById('primary-color-picker');
        const primaryColorPreview = document.getElementById('primary-color-preview');

        if (primaryColorPicker) {
            primaryColorPicker.value = savedPrimaryColor;
        }
        if (primaryColorPreview) {
            primaryColorPreview.textContent = savedPrimaryColor;
        }

        // Load rainbow mode settings
        const rainbowModeCheckbox = document.getElementById('rainbow-mode-checkbox');
        if (rainbowModeCheckbox) {
            rainbowModeCheckbox.checked = settings.rainbowMode || false;
        }

        const rainbowSpeedSlider = document.getElementById('rainbow-speed-slider');
        const rainbowSpeedValue = document.getElementById('rainbow-speed-value');
        if (rainbowSpeedSlider && rainbowSpeedValue) {
            const rainbowSpeed = settings.rainbowSpeed || 5;
            rainbowSpeedSlider.value = rainbowSpeed;
            rainbowSpeedValue.textContent = `${rainbowSpeed}s`;
        }

        // Load behavior settings
        const autoUpdateCheckbox = document.getElementById('auto-update-checkbox');
        const updateIntervalSelect = document.getElementById('update-interval-select');

        if (autoUpdateCheckbox) {
            autoUpdateCheckbox.checked = settings.autoUpdate || false;
        }

        if (updateIntervalSelect) {
            updateIntervalSelect.value = settings.updateInterval || 86400000;
        }

        // Generate theme presets and update active preset
        setTimeout(() => {
            generateThemePresets();
            updateActiveThemePreset();
        }, 100);
    } catch (error) {
        // Fallback to localStorage
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) {
            themeSelect.value = currentTheme;
        }

        const savedPrimaryColor = localStorage.getItem('primaryColor') || '#ff6b35';
        const primaryColorPicker = document.getElementById('primary-color-picker');
        const primaryColorPreview = document.getElementById('primary-color-preview');

        if (primaryColorPicker) {
            primaryColorPicker.value = savedPrimaryColor;
        }
        if (primaryColorPreview) {
            primaryColorPreview.textContent = savedPrimaryColor;
        }

        // Generate theme presets and update active preset (fallback)
        setTimeout(() => {
            generateThemePresets();
            updateActiveThemePreset();
        }, 100);
    }
}



async function saveSettingsModal() {
    try {
        // Get current settings values from the modal
        const themeSelect = document.getElementById('theme-select');
        const primaryColorPicker = document.getElementById('primary-color-picker');
        const rainbowModeCheckbox = document.getElementById('rainbow-mode-checkbox');
        const rainbowSpeedSlider = document.getElementById('rainbow-speed-slider');

        // Save theme setting
        if (themeSelect) {
            currentTheme = themeSelect.value;
            applyTheme(currentTheme);
        }

        // Save rainbow mode settings
        const rainbowMode = rainbowModeCheckbox?.checked || false;

        if (rainbowMode) {
            const rainbowSpeed = rainbowSpeedSlider?.value || 5;
            applyRainbowEffect(rainbowSpeed);
        } else {
            removeRainbowEffect();
            // Save and apply primary color only if rainbow mode is off
            if (primaryColorPicker) {
                const primaryColor = primaryColorPicker.value;
                applyPrimaryColor(primaryColor);
            }
        }

        // Save behavior settings

        // Save all settings
        await saveSettings();
        showNotification('Settings saved successfully', 'success');
        closeSettingsModal();
    } catch (error) {
        showNotification('Failed to save settings', 'error');
    }
}

function openExternal(url) {
    const { shell } = require('electron');
    shell.openExternal(url);
}

// Open settings folder
async function openSettingsFolder() {
    try {
        const settingsPath = await ipcRenderer.invoke('get-settings-path');
        const settingsDir = path.dirname(settingsPath);
        const { shell } = require('electron');
        shell.openPath(settingsDir);
    } catch (error) {
        showNotification('Failed to open settings folder', 'error');
    }
}

// Load and display settings file path
async function loadSettingsPath() {
    try {
        const settingsPath = await ipcRenderer.invoke('get-settings-path');
        const pathElement = document.getElementById('settings-file-path');
        if (pathElement) {
            pathElement.textContent = settingsPath;
        }
    } catch (error) {
        const pathElement = document.getElementById('settings-file-path');
        if (pathElement) {
            pathElement.textContent = 'Error loading path';
        }
    }
}

// Animation helper functions
function addCardAnimation(appId, animationClass) {
    const card = document.querySelector(`[data-app-id="${appId}"]`);
    if (card) {
        card.classList.add(animationClass);
    }
}

function removeCardAnimation(appId, animationClass) {
    const card = document.querySelector(`[data-app-id="${appId}"]`);
    if (card) {
        card.classList.remove(animationClass);
    }
}

// Progress overlay functions
function showProgressOverlay(appId, type, appName) {
    const card = document.querySelector(`[data-app-id="${appId}"]`);
    if (!card) return;

    // Remove existing overlay if present
    const existingOverlay = card.querySelector('.progress-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }

    const overlay = document.createElement('div');
    overlay.className = 'progress-overlay';

    const progressData = getProgressData(type, appName);

    overlay.innerHTML = `
        <div class="progress-glass">
            <div class="progress-icon ${type}">
                <i class="${progressData.icon}"></i>
            </div>
            <div class="progress-title">${progressData.title}</div>
            <div class="progress-subtitle">${progressData.subtitle}</div>
            <div class="progress-bar-container">
                <div class="progress-bar ${type}"></div>
            </div>
        </div>
    `;

    card.appendChild(overlay);

    // Trigger animation
    setTimeout(() => {
        overlay.classList.add('active');
        startProgressAnimation(appId, type);
    }, 100);
}

function hideProgressOverlay(appId) {
    const card = document.querySelector(`[data-app-id="${appId}"]`);
    if (!card) return;

    const overlay = card.querySelector('.progress-overlay');
    if (overlay) {
        overlay.classList.remove('active');
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.remove();
            }
        }, 300);
    }
}

function getProgressData(type, appName) {
    const progressConfigs = {
        installing: {
            icon: 'fas fa-download',
            title: `Installing ${appName}`,
            subtitle: 'Downloading and setting up the application...'
        },
        updating: {
            icon: 'fas fa-sync-alt',
            title: `Updating ${appName}`,
            subtitle: 'Getting the latest version...'
        },
        uninstalling: {
            icon: 'fas fa-trash-alt',
            title: `Uninstalling ${appName}`,
            subtitle: 'Removing application and cleaning up...'
        },
        launching: {
            icon: 'fas fa-rocket',
            title: `Launching ${appName}`,
            subtitle: 'Starting the application...'
        }
    };

    return progressConfigs[type] || progressConfigs.installing;
}

function startProgressAnimation(appId, type) {
    // The infinite progress bar animation is handled purely by CSS
    // No JavaScript animation needed - the CSS animation runs automatically
    const card = document.querySelector(`[data-app-id="${appId}"]`);
    if (card) {
        // Just ensure the progress bar has the correct class for styling
        const progressBar = card.querySelector('.progress-bar');
        if (progressBar) {
            progressBar.classList.add(type);
        }
    }
}

function getStepDuration(type) {
    // Duration in milliseconds for each operation type
    const durations = {
        installing: 8000,  // 8 seconds
        updating: 6000,    // 6 seconds
        uninstalling: 4000, // 4 seconds
        launching: 2000    // 2 seconds
    };

    return durations[type] || 5000;
}

function clearProgressInterval(appId) {
    const card = document.querySelector(`[data-app-id="${appId}"]`);
    if (card && card.dataset.progressInterval) {
        clearInterval(parseInt(card.dataset.progressInterval));
        delete card.dataset.progressInterval;
    }
}

function addButtonLoadingState(appId, buttonType) {
    const card = document.querySelector(`[data-app-id="${appId}"]`);
    if (!card) return;

    let buttonSelector;
    switch (buttonType) {
        case 'install':
            buttonSelector = '.btn-primary';
            break;
        case 'update':
            buttonSelector = '.btn-update';
            break;
        case 'uninstall':
            buttonSelector = '.btn-uninstall';
            break;
        default:
            return;
    }

    const button = card.querySelector(buttonSelector);
    if (button) {
        button.classList.add('loading');
        button.disabled = true;
    }
}

function removeButtonLoadingState(appId) {
    const card = document.querySelector(`[data-app-id="${appId}"]`);
    if (!card) return;

    const buttons = card.querySelectorAll('.btn.loading');
    buttons.forEach(button => {
        button.classList.remove('loading');
        button.disabled = false;
    });
}

// Auto-update functionality
async function setupAutoUpdate() {
    try {
        const settings = await ipcRenderer.invoke('load-settings');

        if (settings.autoUpdate) {
            // Check for updates immediately (silently on startup)
            await checkForUpdatesNow(true);
            // Then start the timer for future checks
            startAutoUpdateTimer(settings.updateInterval || 86400000);
        }
    } catch (error) {
        console.error('Failed to setup auto-update:', error);
    }
}

function startAutoUpdateTimer(interval) {
    // Clear existing timer
    if (autoUpdateInterval) {
        clearInterval(autoUpdateInterval);
    }

    // Set up new timer
    autoUpdateInterval = setInterval(async () => {
        await checkForUpdatesNow();
    }, interval);
}

function stopAutoUpdateTimer() {
    if (autoUpdateInterval) {
        clearInterval(autoUpdateInterval);
        autoUpdateInterval = null;
    }
}

async function checkForUpdatesNow(silent = false) {
    try {
        if (!silent) {
            showNotification('Checking for app updates...', 'info');
        }

        // Reload apps to get latest versions
        await loadApps();

        // Wait a bit for the app status checks to complete
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check which apps need updates using the existing appStatuses object
        const appsNeedingUpdate = [];

        for (const app of apps) {
            if (app.managed) {
                const status = appStatuses[app.id];

                if (status && status.installed && status.version && needsUpdate(status.version, app.version)) {
                    appsNeedingUpdate.push(app);
                }
            }
        }

        if (appsNeedingUpdate.length > 0) {
            const settings = await ipcRenderer.invoke('load-settings');

            if (settings.autoUpdate) {
                // Auto-update enabled, update apps automatically
                showNotification(`Found ${appsNeedingUpdate.length} app(s) to update. Starting automatic updates...`, 'info');

                for (const app of appsNeedingUpdate) {
                    try {
                        // Show progress overlay and loading state
                        showProgressOverlay(app.id, 'updating', app.name);
                        addButtonLoadingState(app.id, 'update');

                        // Create a unique listener for this specific update
                        const updatePromise = new Promise((resolve, reject) => {
                            const timeout = setTimeout(() => {
                                cleanup();
                                reject(new Error('Update timeout'));
                            }, 300000); // 5 minute timeout

                            const onUpdated = (event, appId) => {
                                if (appId === app.id) {
                                    cleanup();
                                    resolve();
                                }
                            };

                            const onUpdateError = (event, appId, error) => {
                                if (appId === app.id) {
                                    cleanup();
                                    reject(new Error(error));
                                }
                            };

                            const cleanup = () => {
                                clearTimeout(timeout);
                                ipcRenderer.removeListener('app-updated', onUpdated);
                                ipcRenderer.removeListener('app-update-error', onUpdateError);

                                // Clean up progress UI
                                clearProgressInterval(app.id);
                                hideProgressOverlay(app.id);
                                removeButtonLoadingState(app.id);
                            };

                            ipcRenderer.on('app-updated', onUpdated);
                            ipcRenderer.on('app-update-error', onUpdateError);
                        });

                        ipcRenderer.send('update-app', app.id);
                        await updatePromise;

                        // Show success animation
                        addCardAnimation(app.id, 'success');
                        setTimeout(() => removeCardAnimation(app.id, 'success'), 1000);
                    } catch (error) {

                        // Clean up progress UI on error
                        clearProgressInterval(app.id);
                        hideProgressOverlay(app.id);
                        removeButtonLoadingState(app.id);

                        // Show error animation
                        addCardAnimation(app.id, 'error');
                        setTimeout(() => removeCardAnimation(app.id, 'error'), 1000);
                    }
                }

                //showNotification('Automatic updates completed', 'success');
            } else {
                // Auto-update disabled, just notify
                if (!silent) {
                    showNotification(`${appsNeedingUpdate.length} app(s) have updates available`, 'info');
                }
            }
        } else {
            if (!silent) {
                showNotification('All apps are up to date', 'success');
            }
        }
    } catch (error) {
        if (!silent) {
            showNotification('Failed to check for updates: ' + error.message, 'error');
        }
    }
}

// ===== TAB SYSTEM FUNCTIONS =====

/**
 * Initialize the tab system
 */
function initTabSystem() {
    // Set up click event listeners for all tab navigation items
    const tabItems = document.querySelectorAll('.tab-item');
    tabItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabName = item.getAttribute('data-tab');
            switchToTab(tabName);
        });
    });

    // Initialize tab search functionality
    initTabSearch();
}

/**
 * Switch to a specific tab
 */
function switchToTab(tabName) {
    if (currentTab === tabName) return;

    console.log(`Switching to tab: ${tabName}`);

    // Validate that both the tab navigation element and content element exist
    const targetTabElement = document.querySelector(`[data-tab="${tabName}"]`);
    const targetContentElement = document.getElementById(`tab-${tabName}`);

    if (!targetTabElement || !targetContentElement) {
        console.error(`Tab "${tabName}" not found`);
        return;
    }

    // Update the global current tab state
    currentTab = tabName;

    // Update tab navigation active states
    const tabItems = document.querySelectorAll('.tab-item');
    tabItems.forEach(item => {
        if (item.getAttribute('data-tab') === tabName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Update tab content active states
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        if (content.id === `tab-${tabName}`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });

    // Save last active tab to localStorage
    try {
        localStorage.setItem('lastActiveTab', tabName);
        console.log(`Saved last active tab: ${tabName}`);
    } catch (error) {
        console.error('Error saving last active tab:', error);
    }

    console.log(`Successfully switched to tab: ${tabName}`);
}

/**
 * Initialize tab search functionality
 */
function initTabSearch() {
    const searchInput = document.getElementById('tab-search');
    if (!searchInput) return;

    searchInput.addEventListener('input', e => {
        searchTabs(e.target.value);
    });

    searchInput.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            searchInput.value = '';
            searchTabs('');
            searchInput.blur();
        }
    });
}

/**
 * Search tabs by name
 */
function searchTabs(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    const tabItems = document.querySelectorAll('.tab-item');

    tabItems.forEach(tabItem => {
        const tabName = tabItem.querySelector('span').textContent.toLowerCase();
        const isMatch = term === '' || tabName.includes(term);

        if (isMatch) {
            tabItem.classList.remove('hidden');
        } else {
            tabItem.classList.add('hidden');
        }
    });
}

// Make tab functions available globally
window.switchToTab = switchToTab;

