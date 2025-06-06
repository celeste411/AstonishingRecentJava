// Initialize the launcher when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeLauncher();
    initializeFeatherIcons();
});

/**
 * Initialize the main launcher functionality
 */
function initializeLauncher() {
    // Initialize navigation
    initializeNavigation();
    
    // Initialize launch functionality
    initializeLaunchButton();
    
    // Initialize settings
    initializeSettings();
    
    // Initialize profiles
    initializeProfiles();
    
    console.log('Space Launcher initialized successfully');
}

/**
 * Initialize Feather icons
 */
function initializeFeatherIcons() {
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
}

/**
 * Initialize navigation between pages
 */
function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const targetPage = this.getAttribute('data-page');
            
            // Remove active class from all nav items and pages
            navItems.forEach(nav => nav.classList.remove('active'));
            pages.forEach(page => page.classList.remove('active'));
            
            // Add active class to clicked nav item and corresponding page
            this.classList.add('active');
            const targetPageElement = document.getElementById(targetPage + '-page');
            if (targetPageElement) {
                targetPageElement.classList.add('active');
            }
            
            console.log(`Navigated to ${targetPage} page`);
        });
    });
}

/**
 * Initialize launch button functionality
 */
function initializeLaunchButton() {
    const launchBtn = document.getElementById('launch-btn');
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingStatus = document.getElementById('loading-status');
    const loadingProgress = document.querySelector('.loading-progress');
    
    if (launchBtn) {
        launchBtn.addEventListener('click', function() {
            const selectedVersion = document.getElementById('version-select').value;
            const selectedProfile = document.getElementById('profile-select').value;
            
            console.log(`Launching Minecraft ${selectedVersion} with profile: ${selectedProfile}`);
            
            // Start launch process
            startLaunchProcess(selectedVersion, selectedProfile);
        });
    }
    
    /**
     * Simulate the launch process with loading states
     */
    function startLaunchProcess(version, profile) {
        // Show loading overlay
        loadingOverlay.classList.add('active');
        launchBtn.classList.add('launching');
        
        const loadingSteps = [
            { message: 'Checking game files...', duration: 1000 },
            { message: 'Downloading missing assets...', duration: 1500 },
            { message: 'Verifying game integrity...', duration: 1200 },
            { message: 'Loading profile configuration...', duration: 800 },
            { message: 'Starting Minecraft...', duration: 2000 }
        ];
        
        let currentStep = 0;
        let totalProgress = 0;
        
        function executeStep() {
            if (currentStep < loadingSteps.length) {
                const step = loadingSteps[currentStep];
                loadingStatus.textContent = step.message;
                
                // Update progress bar
                totalProgress = ((currentStep + 1) / loadingSteps.length) * 100;
                loadingProgress.style.width = totalProgress + '%';
                
                setTimeout(() => {
                    currentStep++;
                    executeStep();
                }, step.duration);
            } else {
                // Launch complete
                completeLaunch(version, profile);
            }
        }
        
        executeStep();
    }
    
    /**
     * Complete the launch process
     */
    function completeLaunch(version, profile) {
        loadingStatus.textContent = 'Launch complete!';
        
        setTimeout(() => {
            // Hide loading overlay
            loadingOverlay.classList.remove('active');
            launchBtn.classList.remove('launching');
            
            // Show success message
            showNotification('Minecraft launched successfully!', 'success');
            
            // Reset loading progress
            loadingProgress.style.width = '0%';
            
            console.log(`Minecraft ${version} launched with profile: ${profile}`);
        }, 1000);
    }
}

/**
 * Initialize settings functionality
 */
function initializeSettings() {
    const saveSettingsBtn = document.querySelector('.settings-actions .btn-primary');
    const resetSettingsBtn = document.querySelector('.settings-actions .btn-secondary');
    
    // Save settings
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', function() {
            const settings = gatherSettings();
            saveSettingsToStorage(settings);
            showNotification('Settings saved successfully!', 'success');
            console.log('Settings saved:', settings);
        });
    }
    
    // Reset settings
    if (resetSettingsBtn) {
        resetSettingsBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to reset all settings to default?')) {
                resetSettingsToDefault();
                showNotification('Settings reset to default', 'info');
                console.log('Settings reset to default');
            }
        });
    }
    
    // Load saved settings on initialization
    loadSettingsFromStorage();
}

/**
 * Gather all settings from the form
 */
function gatherSettings() {
    return {
        javaPath: document.getElementById('java-path').value,
        memoryAllocation: document.getElementById('memory-allocation').value,
        gameDirectory: document.getElementById('game-directory').value,
        closeLauncher: document.getElementById('close-launcher').checked,
        autoUpdate: document.getElementById('auto-update').checked,
        showSnapshots: document.getElementById('show-snapshots').checked,
        jvmArgs: document.getElementById('jvm-args').value
    };
}

/**
 * Save settings to localStorage
 */
function saveSettingsToStorage(settings) {
    localStorage.setItem('spaceLauncherSettings', JSON.stringify(settings));
}

/**
 * Load settings from localStorage
 */
function loadSettingsFromStorage() {
    const savedSettings = localStorage.getItem('spaceLauncherSettings');
    if (savedSettings) {
        try {
            const settings = JSON.parse(savedSettings);
            applySettings(settings);
        } catch (e) {
            console.error('Error loading settings:', e);
        }
    }
}

/**
 * Apply settings to the form
 */
function applySettings(settings) {
    if (settings.javaPath) document.getElementById('java-path').value = settings.javaPath;
    if (settings.memoryAllocation) document.getElementById('memory-allocation').value = settings.memoryAllocation;
    if (settings.gameDirectory) document.getElementById('game-directory').value = settings.gameDirectory;
    if (settings.closeLauncher !== undefined) document.getElementById('close-launcher').checked = settings.closeLauncher;
    if (settings.autoUpdate !== undefined) document.getElementById('auto-update').checked = settings.autoUpdate;
    if (settings.showSnapshots !== undefined) document.getElementById('show-snapshots').checked = settings.showSnapshots;
    if (settings.jvmArgs) document.getElementById('jvm-args').value = settings.jvmArgs;
}

/**
 * Reset all settings to default values
 */
function resetSettingsToDefault() {
    document.getElementById('java-path').value = 'Auto-detect';
    document.getElementById('memory-allocation').value = '4096';
    document.getElementById('game-directory').value = '.minecraft';
    document.getElementById('close-launcher').checked = true;
    document.getElementById('auto-update').checked = false;
    document.getElementById('show-snapshots').checked = false;
    document.getElementById('jvm-args').value = '-XX:+UnlockExperimentalVMOptions -XX:+UseG1GC -XX:G1NewSizePercent=20 -XX:G1ReservePercent=20 -XX:MaxGCPauseMillis=50 -XX:G1HeapRegionSize=32M';
    
    // Clear saved settings
    localStorage.removeItem('spaceLauncherSettings');
}

/**
 * Initialize profile management
 */
function initializeProfiles() {
    const createProfileBtn = document.getElementById('create-profile-btn');
    
    // Create new profile
    if (createProfileBtn) {
        createProfileBtn.addEventListener('click', function() {
            showCreateProfileDialog();
        });
    }
    
    // Load profiles from JSON file
    loadProfilesFromJSON();
}

/**
 * Load profiles from JSON file
 */
async function loadProfilesFromJSON() {
    try {
        const response = await fetch('profiles.json');
        const data = await response.json();
        renderProfiles(data.profiles);
        updateProfileSelector(data.profiles);
    } catch (error) {
        console.error('Error loading profiles:', error);
        showNotification('Failed to load profiles', 'error');
    }
}

/**
 * Render profiles in the profiles grid
 */
function renderProfiles(profiles) {
    const profilesGrid = document.getElementById('profiles-grid');
    if (!profilesGrid) return;
    
    profilesGrid.innerHTML = '';
    
    profiles.forEach(profile => {
        const profileCard = createProfileCard(profile);
        profilesGrid.appendChild(profileCard);
    });
    
    // Initialize Feather icons for newly created elements
    setTimeout(() => {
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }, 100);
}

/**
 * Create a profile card element
 */
function createProfileCard(profile) {
    const card = document.createElement('div');
    card.className = `profile-card ${profile.active ? 'active' : ''}`;
    card.dataset.profileId = profile.id;
    
    const iconSvg = getProfileIcon(profile.icon);
    const modLoaderText = profile.modLoader !== 'vanilla' ? ` + ${profile.modLoader}` : '';
    
    card.innerHTML = `
        <div class="profile-header">
            <div class="profile-icon">
                ${iconSvg}
            </div>
            <div class="profile-info">
                <h3>${profile.name}</h3>
                <span class="profile-version">Minecraft ${profile.version}${modLoaderText}</span>
            </div>
        </div>
        <div class="profile-actions">
            <button class="btn-secondary" data-action="edit">
                <i data-feather="edit"></i>
                Edit
            </button>
            <button class="btn-success" data-action="play">
                <i data-feather="play"></i>
                Play
            </button>
        </div>
    `;
    
    // Add event listeners
    const editBtn = card.querySelector('[data-action="edit"]');
    const playBtn = card.querySelector('[data-action="play"]');
    
    if (editBtn) {
        editBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            editProfile(profile);
        });
    }
    
    if (playBtn) {
        playBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            launchProfile(profile);
        });
    }
    
    // Select profile on click
    card.addEventListener('click', function() {
        const allCards = document.querySelectorAll('.profile-card');
        allCards.forEach(c => c.classList.remove('active'));
        this.classList.add('active');
        
        console.log(`Selected profile: ${profile.name}`);
    });
    
    return card;
}

/**
 * Get profile icon SVG based on icon type
 */
function getProfileIcon(iconType) {
    const icons = {
        default: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <rect x="9" y="9" width="6" height="6"></rect>
        </svg>`,
        modded: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
            <path d="M2 17l10 5 10-5"></path>
            <path d="M2 12l10 5 10-5"></path>
        </svg>`,
        creative: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 15.09 8.26 22 9 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9 8.91 8.26 12 2"></polygon>
        </svg>`
    };
    
    return icons[iconType] || icons.default;
}

/**
 * Update profile selector dropdown
 */
function updateProfileSelector(profiles) {
    const profileSelect = document.getElementById('profile-select');
    if (!profileSelect) return;
    
    profileSelect.innerHTML = '';
    
    profiles.forEach(profile => {
        const option = document.createElement('option');
        option.value = profile.id;
        option.textContent = profile.name;
        if (profile.active) {
            option.selected = true;
        }
        profileSelect.appendChild(option);
    });
}

/**
 * Save profiles to JSON file (simulated with localStorage)
 */
function saveProfilesToStorage(profiles) {
    localStorage.setItem('spaceLauncherProfiles', JSON.stringify({ profiles }));
}

/**
 * Load profiles from localStorage if available
 */
function loadProfilesFromStorage() {
    const saved = localStorage.getItem('spaceLauncherProfiles');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            return data.profiles || [];
        } catch (error) {
            console.error('Error parsing saved profiles:', error);
        }
    }
    return null;
}

/**
 * Create new profile
 */
function createNewProfile(profileData) {
    // Try to load existing profiles
    const savedProfiles = loadProfilesFromStorage();
    
    if (savedProfiles) {
        // Add to existing profiles
        const newProfile = {
            id: generateProfileId(),
            created: new Date().toISOString(),
            lastUsed: new Date().toISOString(),
            active: false,
            ...profileData
        };
        
        savedProfiles.push(newProfile);
        saveProfilesToStorage(savedProfiles);
        renderProfiles(savedProfiles);
        updateProfileSelector(savedProfiles);
        
        return newProfile;
    } else {
        // Fallback: reload from JSON and add new profile
        loadProfilesFromJSON().then(() => {
            const newProfile = {
                id: generateProfileId(),
                created: new Date().toISOString(),
                lastUsed: new Date().toISOString(),
                active: false,
                ...profileData
            };
            
            // This is a simplified approach for demo purposes
            showNotification(`Profile "${profileData.name}" created successfully!`, 'success');
        });
    }
}

/**
 * Generate unique profile ID
 */
function generateProfileId() {
    return 'profile_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Show create profile dialog
 */
function showCreateProfileDialog() {
    const profileName = prompt('Enter profile name:');
    if (profileName && profileName.trim()) {
        const profileData = {
            name: profileName.trim(),
            version: '1.20.4',
            modLoader: 'vanilla',
            icon: 'default',
            gameDirectory: '.minecraft',
            javaPath: 'Auto-detect',
            memoryAllocation: 4096,
            jvmArgs: '-XX:+UnlockExperimentalVMOptions -XX:+UseG1GC'
        };
        
        createNewProfile(profileData);
    }
}

/**
 * Edit profile
 */
function editProfile(profile) {
    console.log(`Editing profile: ${profile.name}`);
    showNotification(`Opening editor for "${profile.name}"`, 'info');
}

/**
 * Launch specific profile
 */
function launchProfile(profile) {
    console.log(`Launching profile: ${profile.name}`);
    
    // Update the profile selector to match the launched profile
    const profileSelect = document.getElementById('profile-select');
    if (profileSelect) {
        profileSelect.value = profile.id;
    }
    
    // Update last used timestamp
    updateProfileLastUsed(profile.id);
    
    // Trigger launch
    const launchBtn = document.getElementById('launch-btn');
    if (launchBtn) {
        launchBtn.click();
    }
}

/**
 * Update profile last used timestamp
 */
function updateProfileLastUsed(profileId) {
    const savedProfiles = loadProfilesFromStorage();
    if (savedProfiles) {
        const profile = savedProfiles.find(p => p.id === profileId);
        if (profile) {
            profile.lastUsed = new Date().toISOString();
            saveProfilesToStorage(savedProfiles);
        }
    }
}

/**
 * Show notification to user
 */
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;
    
    // Add notification styles if not already present
    if (!document.querySelector('#notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: hsl(var(--card));
                border: 1px solid hsl(var(--border));
                border-radius: var(--radius);
                padding: 16px;
                box-shadow: var(--shadow-lg);
                z-index: 1001;
                max-width: 300px;
                animation: slideIn 0.3s ease;
            }
            
            .notification-success {
                border-left: 4px solid hsl(var(--success-color));
            }
            
            .notification-info {
                border-left: 4px solid hsl(var(--accent-color));
            }
            
            .notification-warning {
                border-left: 4px solid hsl(var(--warning-color));
            }
            
            .notification-error {
                border-left: 4px solid hsl(var(--danger-color));
            }
            
            .notification-content {
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            
            .notification-message {
                color: hsl(var(--foreground));
                font-size: 14px;
                font-weight: 500;
            }
            
            .notification-close {
                background: none;
                border: none;
                color: hsl(var(--foreground) / 0.6);
                font-size: 18px;
                cursor: pointer;
                margin-left: 12px;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .notification-close:hover {
                color: hsl(var(--foreground));
            }
            
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(styles);
    }
    
    // Add to page
    document.body.appendChild(notification);
    
    // Handle close button
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.remove();
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

/**
 * Handle window resize for responsive behavior
 */
window.addEventListener('resize', function() {
    // Re-initialize Feather icons after potential layout changes
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
});

/**
 * Handle keyboard shortcuts
 */
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + Enter to launch
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const launchBtn = document.getElementById('launch-btn');
        if (launchBtn && !launchBtn.classList.contains('launching')) {
            launchBtn.click();
        }
    }
    
    // Escape to close loading overlay
    if (e.key === 'Escape') {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay && loadingOverlay.classList.contains('active')) {
            loadingOverlay.classList.remove('active');
            const launchBtn = document.getElementById('launch-btn');
            if (launchBtn) {
                launchBtn.classList.remove('launching');
            }
        }
    }
});

// Export functions for potential external use
window.SpaceLauncher = {
    showNotification,
    launchProfile,
    gatherSettings,
    saveSettingsToStorage,
    loadSettingsFromStorage
};
