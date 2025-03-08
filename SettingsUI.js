class SettingsUI {
    constructor(playerDataManager) {
        // Reference to player data manager for saving settings
        this.playerDataManager = playerDataManager;

        // DOM elements
        this.settingsButton = null;
        this.settingsPanel = null;
        this.zenModeButton = null;

        // Track state
        this.isVisible = false;
        this.zenModeActive = false;

        // Key binding related properties
        this.currentKeyBindings = {
            lane1: 's',
            lane2: 'd',
            lane3: 'k',
            lane4: 'l'
        };

        // Store the key being reconfigured
        this.currentRebindingLane = null;

        // List of disallowed keys
        this.disallowedKeys = [
            // Function keys
            'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
            // Navigation keys
            'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown',
            // Special keys
            'Escape', 'Tab', 'CapsLock', 'Shift', 'Control', 'Alt', 'Meta', 'ContextMenu',
            'Enter', 'Backspace', 'Delete', 'Insert', 'PrintScreen', 'ScrollLock', 'Pause',
            // Other special keys
            ' ' // Space
        ];

        // Add F9 listener for Zen Mode toggle
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F9') {
                e.preventDefault(); // Prevent any browser shortcuts
                this.toggleZenMode();
            }
        });
    }

    init() {
        this.createSettingsButton();
        this.createSettingsPanel();
        this.loadSettings();
    }

    createSettingsButton() {
        // Create the settings button
        this.settingsButton = document.createElement('button');
        this.settingsButton.id = 'settingsButton';
        this.settingsButton.innerHTML = '<span>⚙️</span> Settings';
        this.settingsButton.classList.add('settings-button');

        // Add to DOM
        document.getElementById('gameContainer').appendChild(this.settingsButton);

        // Add event listener
        this.settingsButton.addEventListener('click', () => this.toggleSettingsPanel());
    }

    createSettingsPanel() {
        // Create the settings panel
        this.settingsPanel = document.createElement('div');
        this.settingsPanel.id = 'settingsPanel';
        this.settingsPanel.classList.add('settings-panel');
        this.settingsPanel.style.display = 'none';

        // Create the content with added Fullscreen button
        this.settingsPanel.innerHTML = `
            <div class="settings-content">
                <div class="settings-header">
                    <h1>Settings</h1>
                    <button id="closeSettingsButton" class="close-button">×</button>
                </div>

                <div class="settings-section">
                    <h2>Controls</h2>
                    <div class="key-bindings">
                        <div class="key-binding-row">
                            <span>Lane 1:</span>
                            <button class="key-binding-button" data-lane="lane1"></button>
                        </div>
                        <div class="key-binding-row">
                            <span>Lane 2:</span>
                            <button class="key-binding-button" data-lane="lane2"></button>
                        </div>
                        <div class="key-binding-row">
                            <span>Lane 3:</span>
                            <button class="key-binding-button" data-lane="lane3"></button>
                        </div>
                        <div class="key-binding-row">
                            <span>Lane 4:</span>
                            <button class="key-binding-button" data-lane="lane4"></button>
                        </div>
                        <div class="key-binding-row">
                            <button id="resetKeysButton" class="secondary-button">Reset to Default</button>
                        </div>
                    </div>
                </div>

                <div class="settings-section">
                    <h2>Game Options</h2>
                    <div class="options-container">
                        <button id="fullscreenButtonSettings" class="options-button">Fullscreen Mode (F11)</button>
                        <button id="zenModeToggle" class="options-button">Enable Zen Mode (F9) - Hide UI Elements</button>
                        <button id="helpButtonSettings" class="options-button">Help / How to Play</button>
                        <button id="resetScoresButtonSettings" class="options-button danger-button">Reset All Scores</button>
                    </div>
                </div>
            </div>
        `;

        // Add to DOM
        document.getElementById('gameContainer').appendChild(this.settingsPanel);

        // Set up event listeners
        document.getElementById('closeSettingsButton').addEventListener('click', () => this.hideSettingsPanel());
        document.getElementById('resetKeysButton').addEventListener('click', () => this.resetKeyBindings());
        document.getElementById('zenModeToggle').addEventListener('click', () => this.toggleZenMode());
        document.getElementById('helpButtonSettings').addEventListener('click', () => this.openHelp());
        document.getElementById('resetScoresButtonSettings').addEventListener('click', () => this.openScoreResetConfirmation());
        document.getElementById('fullscreenButtonSettings').addEventListener('click', () => this.toggleFullscreen());

        // Set up key binding buttons
        const keyBindingButtons = document.querySelectorAll('.key-binding-button');
        keyBindingButtons.forEach(button => {
            // Show the current key binding
            this.updateKeyBindingButton(button);

            // Add click event to enter rebinding mode
            button.addEventListener('click', (e) => {
                this.startRebinding(e.target.getAttribute('data-lane'));
            });
        });

        // Add keyboard listener for rebinding
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));

        // Close settings when clicking outside the panel
        this.settingsPanel.addEventListener('click', (e) => {
            if (e.target === this.settingsPanel) {
                this.hideSettingsPanel();
            }
        });

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hideSettingsPanel();
            }
        });
    }

    toggleSettingsPanel() {
        if (this.isVisible) {
            this.hideSettingsPanel();
        } else {
            this.showSettingsPanel();
        }
    }

    showSettingsPanel() {
        this.settingsPanel.style.display = 'flex';
        this.isVisible = true;

        // Refresh key binding display
        this.updateAllKeyBindingButtons();

        // Update Zen Mode button text
        this.updateZenModeButton();

        // If game is running, pause it
        if (window.gameManager && window.gameManager.isRunning) {
            window.gameManager.music.pause();
        }
    }

    hideSettingsPanel() {
        // Save the current settings when closing
        this.saveSettings();

        this.settingsPanel.style.display = 'none';
        this.isVisible = false;

        // If a game is paused (and not showing something else like the end screen), resume it
        if (window.gameManager && window.gameManager.isRunning && !window.gameManager.showingEndScreen) {
            window.gameManager.music.play();
        }
    }

    updateAllKeyBindingButtons() {
        const keyBindingButtons = document.querySelectorAll('.key-binding-button');
        keyBindingButtons.forEach(button => {
            this.updateKeyBindingButton(button);
        });
    }

    updateKeyBindingButton(button) {
        const lane = button.getAttribute('data-lane');
        const key = this.currentKeyBindings[lane];
        button.textContent = key.toUpperCase();

        // Show active state if in rebinding mode for this lane
        if (this.currentRebindingLane === lane) {
            button.classList.add('rebinding');
            button.textContent = 'Press a key...';
        } else {
            button.classList.remove('rebinding');
        }
    }

    startRebinding(lane) {
        // If already rebinding another key, exit that mode first
        if (this.currentRebindingLane) {
            const currentButton = document.querySelector(`.key-binding-button[data-lane="${this.currentRebindingLane}"]`);
            currentButton.classList.remove('rebinding');
        }

        // Enter rebinding mode for the selected lane
        this.currentRebindingLane = lane;
        const button = document.querySelector(`.key-binding-button[data-lane="${lane}"]`);
        button.classList.add('rebinding');
        button.textContent = 'Press a key...';
    }

    handleKeyPress(event) {
        // Only process if we're in rebinding mode
        if (!this.currentRebindingLane || !this.isVisible) return;

        // Get the actual key value
        const key = event.key.toLowerCase();
        const button = document.querySelector(`.key-binding-button[data-lane="${this.currentRebindingLane}"]`);

        // Check if the key is allowed
        if (this.disallowedKeys.includes(event.key)) {
            console.log(`Key ${key} is not allowed for gameplay`);

            button.textContent = 'Invalid key!';
            button.style.backgroundColor = '#a02525';

            // Reset after a short delay
            setTimeout(() => {
                this.updateKeyBindingButton(button);
                this.currentRebindingLane = null;
            }, 1000);

            return;
        }

        // Check if the key is already assigned to another lane
        const isAlreadyUsed = Object.entries(this.currentKeyBindings).some(
            ([lane, laneKey]) => lane !== this.currentRebindingLane && laneKey === key
        );

        if (isAlreadyUsed) {
            console.log(`Key ${key} is already assigned to another lane`);

            button.textContent = 'Already used!';
            button.style.backgroundColor = '#a02525';

            // Reset after a short delay
            setTimeout(() => {
                this.updateKeyBindingButton(button);
                this.currentRebindingLane = null;
            }, 1000);

            return;
        }

        // Assign the key
        this.currentKeyBindings[this.currentRebindingLane] = key;

        // Immediately update the button to show the key
        button.textContent = key.toUpperCase();
        button.classList.remove('rebinding');
        button.classList.add('key-binding-confirmed');

        // After a short delay, remove the confirmation class
        setTimeout(() => {
            button.classList.remove('key-binding-confirmed');
            this.currentRebindingLane = null;
        }, 500);

        // Prevent the default action for the key
        event.preventDefault();
    }

    resetKeyBindings() {
        // Reset to default key bindings
        this.currentKeyBindings = {
            lane1: 's',
            lane2: 'd',
            lane3: 'k',
            lane4: 'l'
        };

        // Update the display
        this.updateAllKeyBindingButtons();

        // Save the changes
        this.saveSettings();
    }

    toggleZenMode() {
        this.zenModeActive = !this.zenModeActive;
        this.applyZenMode();
        this.updateZenModeButton();
    }

    updateZenModeButton() {
        const button = document.getElementById('zenModeToggle');
        if (button) {
            button.textContent = this.zenModeActive ?
                'Disable Zen Mode (F9)' :
                'Enable Zen Mode (F9) - Hide UI Elements';
        }
    }

    applyZenMode() {
        const gameContainer = document.getElementById('gameContainer');

        if (this.zenModeActive) {
            // Hide UI elements
            gameContainer.classList.add('zen-mode');
        } else {
            // Show UI elements
            gameContainer.classList.remove('zen-mode');
        }

        // Save the setting
        this.saveSettings();
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }

        // Hide the settings panel after toggling fullscreen
        this.hideSettingsPanel();
    }

    openHelp() {
        // Hide settings panel
        this.hideSettingsPanel();

        // Show help panel
        const helpPanel = document.getElementById('helpPanel');
        if (helpPanel) {
            helpPanel.style.display = 'flex';

            // If game is running, keep it paused
            if (window.gameManager && window.gameManager.isRunning) {
                window.gameManager.music.pause();
            }
        }
    }

    openScoreResetConfirmation() {
        // Hide settings panel
        this.hideSettingsPanel();

        // Show confirmation dialog
        const confirmationDialog = document.getElementById('confirmationDialog');
        if (confirmationDialog) {
            confirmationDialog.style.display = 'block';
        }
    }

    async loadSettings() {
        if (!this.playerDataManager) return;

        try {
            // Load custom key bindings
            const keyBindings = await this.playerDataManager.getKeyBindings();
            if (keyBindings) {
                this.currentKeyBindings = keyBindings;
            }

            // Load zen mode setting
            const gameSettings = await this.playerDataManager.getGameSettings();
            if (gameSettings) {
                this.zenModeActive = gameSettings.zenMode || false;
            }

            // Apply zen mode if active
            if (this.zenModeActive) {
                this.applyZenMode();
            }

            // Update UI to match loaded settings
            this.updateAllKeyBindingButtons();
            this.updateZenModeButton();
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }

    async saveSettings() {
        if (!this.playerDataManager) return;

        try {
            // Save key bindings
            await this.playerDataManager.saveKeyBindings(this.currentKeyBindings);

            // Save other game settings
            await this.playerDataManager.saveGameSettings({
                zenMode: this.zenModeActive
            });

            // Update the current game if it's running
            if (window.gameManager) {
                window.gameManager.updateKeyBindings(this.currentKeyBindings);
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }

    // Method to get key bindings for GameManager
    getKeyBindings() {
        return { ...this.currentKeyBindings };
    }
}