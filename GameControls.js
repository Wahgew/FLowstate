/**
 * game-controls.js - Controls and UI interactions for Flowstate rhythm game
 */

// Resolution handling
function resizeGame() {
    const gameContainer = document.getElementById('gameContainer');
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const gameAspectRatio = 1920 / 1080;
    const windowAspectRatio = windowWidth / windowHeight;

    let scale;
    if (windowAspectRatio > gameAspectRatio) {
        scale = (windowHeight / 1080) * 0.95;
    } else {
        scale = (windowWidth / 1920) * 0.95;
    }

    gameContainer.style.transform = `scale(${scale})`;
}

// Fullscreen handling
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log(`Error attempting to enable fullscreen: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
}

// Set up event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Event listeners for fullscreen
    window.addEventListener('resize', resizeGame);
    document.getElementById('fullscreenButton').addEventListener('click', toggleFullscreen);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F11') {
            e.preventDefault();
            toggleFullscreen();
        }
    });

    // Reset scores functionality
    const resetScoresButton = document.getElementById('resetScoresButton');
    const confirmationDialog = document.getElementById('confirmationDialog');
    const confirmYes = document.getElementById('confirmYes');
    const confirmNo = document.getElementById('confirmNo');

    resetScoresButton.addEventListener('click', () => {
        confirmationDialog.style.display = 'block';
    });

    confirmYes.addEventListener('click', async () => {
        if (window.playerDataManager) {
            await window.playerDataManager.clearAllRecords();
            // Refresh the song selection UI if it's visible
            if (window.gameManager && window.gameManager.onSongSelect) {
                window.gameManager.onSongSelect();
            }
        }
        confirmationDialog.style.display = 'none';
    });

    confirmNo.addEventListener('click', () => {
        confirmationDialog.style.display = 'none';
    });

    // Close dialog if clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === confirmationDialog) {
            confirmationDialog.style.display = 'none';
        }
    });

    // Help panel functionality
    const helpButton = document.getElementById('helpButton');
    const helpPanel = document.getElementById('helpPanel');
    const closeHelpButton = document.getElementById('closeHelpButton');

    // Show help panel
    helpButton.addEventListener('click', function() {
        helpPanel.style.display = 'flex';

        // If game is running, pause it
        if (window.gameManager && window.gameManager.isRunning) {
            window.gameManager.music.pause();
        }
    });

    // Hide help panel
    closeHelpButton.addEventListener('click', function() {
        helpPanel.style.display = 'none';

        // If game was running, resume it
        if (window.gameManager && window.gameManager.isRunning) {
            window.gameManager.music.play();
        }
    });

    // Close help panel with Escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && helpPanel.style.display === 'flex') {
            helpPanel.style.display = 'none';

            // If game was running, resume it
            if (window.gameManager && window.gameManager.isRunning) {
                window.gameManager.music.play();
            }
        }
    });

    // Volume control setup
    setupVolumeControls();

    // Initial resize
    resizeGame();
});

// Volume control functionality
function setupVolumeControls() {
    const songVolumeSlider = document.getElementById('songVolumeSlider');
    const hitSoundVolumeSlider = document.getElementById('hitSoundVolumeSlider');
    const missSoundVolumeSlider = document.getElementById('missSoundVolumeSlider');

    const songVolumeValue = document.getElementById('songVolumeValue');
    const hitSoundVolumeValue = document.getElementById('hitSoundVolumeValue');
    const missSoundVolumeValue = document.getElementById('missSoundVolumeValue');

    // Update volumes function to prevent recursion
    function updateVolumes() {
        // Check if the function is already being called from Main.js
        if (window._updatingVolumesFromMain) {
            return; // Prevent recursive calls
        }

        // Set flag to prevent recursion
        window._updatingVolumesFromIndex = true;

        try {
            if (window.volumeState) {
                // Update global state
                window.volumeState.songVolume = songVolumeSlider.value / 100;
                window.volumeState.hitSoundVolume = hitSoundVolumeSlider.value / 100;
                window.volumeState.missSoundVolume = missSoundVolumeSlider.value / 100;

                // Update display values
                songVolumeValue.textContent = `${songVolumeSlider.value}%`;
                hitSoundVolumeValue.textContent = `${hitSoundVolumeSlider.value}%`;
                missSoundVolumeValue.textContent = `${missSoundVolumeSlider.value}%`;

                // Update game manager if it exists
                if (window.gameManager) {
                    window.gameManager.setSongVolume(window.volumeState.songVolume);
                    window.gameManager.setHitSoundVolume(window.volumeState.hitSoundVolume);
                }

                // If updateVolumes in Main.js exists and we're not in a recursion state, call it
                if (window.updateVolumes && !window._updatingVolumesFromMain) {
                    window._updatingVolumesFromIndex = false; // Clear flag before calling
                    window.updateVolumes();
                }
            }
        } finally {
            // Clear flag
            window._updatingVolumesFromIndex = false;
        }
    }

    // Add event listeners for all volume sliders
    songVolumeSlider.addEventListener('input', updateVolumes);
    hitSoundVolumeSlider.addEventListener('input', updateVolumes);
    missSoundVolumeSlider.addEventListener('input', updateVolumes);

    // Store volume preferences in localStorage
    function saveVolumePreferences() {
        if (window.playerDataManager) {
            // If PlayerDataManager is available, save using that
            window.playerDataManager.saveVolumeSettings(window.volumeState);
        } else {
            // Otherwise, save to localStorage as fallback
            localStorage.setItem('songVolume', songVolumeSlider.value);
            localStorage.setItem('hitSoundVolume', hitSoundVolumeSlider.value);
            localStorage.setItem('missSoundVolume', missSoundVolumeSlider.value);
        }
    }

    // Load volume preferences
    function loadVolumePreferences() {
        // Try to get values from localStorage
        const savedSongVolume = localStorage.getItem('songVolume');
        const savedHitSoundVolume = localStorage.getItem('hitSoundVolume');
        const savedMissSoundVolume = localStorage.getItem('missSoundVolume');

        if (savedSongVolume !== null) {
            songVolumeSlider.value = savedSongVolume;
        }
        if (savedHitSoundVolume !== null) {
            hitSoundVolumeSlider.value = savedHitSoundVolume;
        }
        if (savedMissSoundVolume !== null) {
            missSoundVolumeSlider.value = savedMissSoundVolume;
        }

        // Update the volume values in UI
        songVolumeValue.textContent = `${songVolumeSlider.value}%`;
        hitSoundVolumeValue.textContent = `${hitSoundVolumeSlider.value}%`;
        missSoundVolumeValue.textContent = `${missSoundVolumeSlider.value}%`;
    }

    // Save volumes when changed
    songVolumeSlider.addEventListener('change', saveVolumePreferences);
    hitSoundVolumeSlider.addEventListener('change', saveVolumePreferences);
    missSoundVolumeSlider.addEventListener('change', saveVolumePreferences);

    // Load saved volumes when page loads
    loadVolumePreferences();
}