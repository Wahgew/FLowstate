window.onload = async function() {
    const canvas = document.getElementById('gameWorld');
    const ctx = canvas.getContext('2d');

    // Global volume state
    window.volumeState = {
        songVolume: 0.5,          // Default values
        hitSoundVolume: 0.4,      // For note hit sounds
        scrollSoundVolume: 0.1,   // For menu navigation
        missSoundVolume: 0.8,      // For missed notes
        applauseSoundVolume: 0.3  // For applause on high scores
    };

    function drawLoadingScreen(progress, message) {
        // Clear the canvas first
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw loading message
        ctx.font = '40px nunito';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText(message, canvas.width / 2, canvas.height / 2 - 50);

        // Draw progress bar
        const barWidth = 400;
        const barHeight = 20;
        const x = (canvas.width - barWidth) / 2;
        const y = canvas.height / 2;

        // Draw progress bar border
        ctx.strokeStyle = 'white';
        ctx.strokeRect(x, y, barWidth, barHeight);

        // Calculate progress width (ensure it's between 0 and barWidth)
        const progressWidth = Math.max(0, Math.min(barWidth, barWidth * (progress / 100)));

        // Draw progress bar fill
        ctx.fillStyle = 'white';
        ctx.fillRect(x, y, progressWidth, barHeight);

        // Log progress to console for debugging
        console.log(`Loading progress: ${progress.toFixed(1)}%`);
    }

    try {
        // Show initial loading screen
        drawLoadingScreen(0, 'Initializing...');

        // Initialize PlayerDataManager first
        drawLoadingScreen(5, 'Loading Player Data...');
        const playerData = new PlayerDataManager();
        await playerData.initializeDB();
        window.playerDataManager = playerData;
        drawLoadingScreen(20, 'Player Data Loaded');

        // Load volume settings from PlayerDataManager
        drawLoadingScreen(25, 'Loading Settings...');
        const volumeSettings = await playerData.getVolumeSettings();
        if (volumeSettings) {
            // Update volumeState with loaded settings
            window.volumeState.songVolume = volumeSettings.songVolume;
            window.volumeState.hitSoundVolume = volumeSettings.hitSoundVolume;
            window.volumeState.scrollSoundVolume = volumeSettings.scrollSoundVolume || 0.0;
            window.volumeState.missSoundVolume = volumeSettings.missSoundVolume || 0.8; // Default to 0.8 if not found
        }
        drawLoadingScreen(35, 'Settings Loaded');

        // Initialize the volume control sliders
        drawLoadingScreen(40, 'Initializing Controls...');
        initializeVolumeControls();
        drawLoadingScreen(45, 'Controls Initialized');

        // Initialize song loader
        drawLoadingScreen(50, 'Loading Songs...');
        const songLoader = new SongLoader();

        // Create a progress update callback for song loading
        songLoader.onProgressUpdate = (progress) => {
            // Map the song loader progress (0-100) to our overall progress (50-90)
            const mappedProgress = 50 + (progress * 0.4); // Maps 0-100 to 50-90
            drawLoadingScreen(mappedProgress, 'Loading Songs...');
        };

        // Load all songs (with progress updates)
        await songLoader.loadAllSongs();
        drawLoadingScreen(90, 'Songs Loaded');

        // Initialize song selection UI
        const songSelect = new SongSelectUI(canvas, songLoader, playerData);
        songSelect.show();
        drawLoadingScreen(100, 'Done!');

        // Brief delay to show 100% completion
        await new Promise(resolve => setTimeout(resolve, 300));

        // Handle keyboard input for song selection
        document.addEventListener('keydown', (event) => {
            const selectedSong = songSelect.handleInput(event);

            if (selectedSong) {
                songSelect.hide();

                // Create game manager with selected song and player data
                window.gameManager = new GameManager({
                    id: selectedSong.id,
                    data: selectedSong.data
                }, playerData);

                // Use global volume state
                window.gameManager.setSongVolume(window.volumeState.songVolume);
                window.gameManager.setHitSoundVolume(window.volumeState.hitSoundVolume);
                window.gameManager.setMissSoundVolume(window.volumeState.missSoundVolume);

                window.gameManager.onSongSelect = () => {
                    window.gameManager.music.pause();
                    window.gameManager.music.currentTime = 0;
                    window.gameManager.isRunning = false;
                    songSelect.show();
                };
            }
        });

        // Update the updateVolumes function in Main.js
        window.updateVolumes = async function() {
            // Set flag to prevent recursion from index.html script
            window._updatingVolumesFromMain = true;

            try {
                const songVolumeSlider = document.getElementById('songVolumeSlider');
                const hitSoundVolumeSlider = document.getElementById('hitSoundVolumeSlider');
                const missSoundVolumeSlider = document.getElementById('missSoundVolumeSlider');

                // Exit if any element is missing
                if (!songVolumeSlider || !hitSoundVolumeSlider || !missSoundVolumeSlider) {
                    console.error('Missing volume slider elements');
                    return;
                }

                const songVolumeValue = document.getElementById('songVolumeValue');
                const hitSoundVolumeValue = document.getElementById('hitSoundVolumeValue');
                const missSoundVolumeValue = document.getElementById('missSoundVolumeValue');

                // Update global state
                window.volumeState.songVolume = songVolumeSlider.value / 100;
                window.volumeState.hitSoundVolume = hitSoundVolumeSlider.value / 100;
                window.volumeState.missSoundVolume = missSoundVolumeSlider.value / 100;

                // Update display values if elements exist
                if (songVolumeValue) songVolumeValue.textContent = `${songVolumeSlider.value}%`;
                if (hitSoundVolumeValue) hitSoundVolumeValue.textContent = `${hitSoundVolumeSlider.value}%`;
                if (missSoundVolumeValue) missSoundVolumeValue.textContent = `${missSoundVolumeSlider.value}%`;

                // Update game manager if it exists
                if (window.gameManager) {
                    window.gameManager.setSongVolume(window.volumeState.songVolume);
                    window.gameManager.setHitSoundVolume(window.volumeState.hitSoundVolume);
                }

                // Save to PlayerDataManager
                if (window.playerDataManager) {
                    await window.playerDataManager.saveVolumeSettings(window.volumeState);
                }
            } finally {
                // Clear flag
                window._updatingVolumesFromMain = false;
            }
        };

    } catch (error) {
        console.error('Error initializing game:', error);
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = '24px nunito';
        ctx.fillStyle = 'red';
        ctx.textAlign = 'center';
        ctx.fillText('Error loading game resources', canvas.width / 2, canvas.height / 2);
        ctx.font = '18px nunito';
        ctx.fillText(error.message, canvas.width / 2, canvas.height / 2 + 30);
    }
};

// Function to initialize volume sliders with values from volumeState
function initializeVolumeControls() {
    // Get references to all sliders and display elements
    const songVolumeSlider = document.getElementById('songVolumeSlider');
    const hitSoundVolumeSlider = document.getElementById('hitSoundVolumeSlider');
    const missSoundVolumeSlider = document.getElementById('missSoundVolumeSlider');

    const songVolumeValue = document.getElementById('songVolumeValue');
    const hitSoundVolumeValue = document.getElementById('hitSoundVolumeValue');
    const missSoundVolumeValue = document.getElementById('missSoundVolumeValue');

    // Make sure volumeState exists
    if (!window.volumeState) {
        console.error('Volume state not available');
        return;
    }

    // Make sure the elements exist before setting values
    if (!songVolumeSlider || !hitSoundVolumeSlider || !missSoundVolumeSlider) {
        console.error('Volume slider elements not found');
        return;
    }

    console.log('Initializing volume controls with:', window.volumeState);

    // Update slider values from volumeState (convert from 0-1 to 0-100)
    songVolumeSlider.value = Math.round(window.volumeState.songVolume * 100);
    hitSoundVolumeSlider.value = Math.round(window.volumeState.hitSoundVolume * 100);
    missSoundVolumeSlider.value = Math.round(window.volumeState.missSoundVolume * 100);

    // Update display text if elements exist
    if (songVolumeValue) songVolumeValue.textContent = `${songVolumeSlider.value}%`;
    if (hitSoundVolumeValue) hitSoundVolumeValue.textContent = `${hitSoundVolumeSlider.value}%`;
    if (missSoundVolumeValue) missSoundVolumeValue.textContent = `${missSoundVolumeSlider.value}%`;
}