window.onload = async function() {
    const canvas = document.getElementById('gameWorld');
    const ctx = canvas.getContext('2d');

    // Global volume state
    window.volumeState = {
        songVolume: 0.5,    // Default values
        hitSoundVolume: 0.4
    };

    function drawLoadingScreen(progress, message) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = '40px nunito';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText(message, canvas.width / 2, canvas.height / 2 - 50);

        // Draw progress bar
        const barWidth = 400;
        const barHeight = 20;
        const x = (canvas.width - barWidth) / 2;
        const y = canvas.height / 2;

        ctx.strokeStyle = 'white';
        ctx.strokeRect(x, y, barWidth, barHeight);
        ctx.fillStyle = 'white';
        ctx.fillRect(x, y, barWidth * (progress / 100), barHeight);
    }

    try {
        // Initialize PlayerDataManager first
        const playerData = new PlayerDataManager();
        await playerData.initializeDB();
        window.playerDataManager = playerData;

        // Load volume settings from PlayerDataManager
        const volumeSettings = await playerData.getVolumeSettings();
        if (volumeSettings) {
            window.volumeState.songVolume = volumeSettings.songVolume;
            window.volumeState.hitSoundVolume = volumeSettings.hitSoundVolume;

            // Update sliders to match loaded values
            const songVolumeSlider = document.getElementById('songVolumeSlider');
            const hitSoundVolumeSlider = document.getElementById('hitSoundVolumeSlider');
            const songVolumeValue = document.getElementById('songVolumeValue');
            const hitSoundVolumeValue = document.getElementById('hitSoundVolumeValue');

            songVolumeSlider.value = volumeSettings.songVolume * 100;
            hitSoundVolumeSlider.value = volumeSettings.hitSoundVolume * 100;
            songVolumeValue.textContent = `${Math.round(volumeSettings.songVolume * 100)}%`;
            hitSoundVolumeValue.textContent = `${Math.round(volumeSettings.hitSoundVolume * 100)}%`;
        }

        // Initialize song loader
        const songLoader = new SongLoader();
        drawLoadingScreen(0, 'Loading Songs...');
        await songLoader.loadAllSongs();

        // Load all player records
        drawLoadingScreen(50, 'Loading Player Data...');
        const playerRecords = await playerData.getAllRecords();

        // Initialize song selection UI
        const songSelect = new SongSelectUI(canvas, songLoader, playerData);
        songSelect.show();

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

                // Use current volume state instead of hardcoded values
                window.gameManager.setHitSoundVolume(window.volumeState.hitSoundVolume);
                window.gameManager.setSongVolume(window.volumeState.songVolume);

                window.gameManager.onSongSelect = () => {
                    window.gameManager.music.pause();
                    window.gameManager.music.currentTime = 0;
                    window.gameManager.isRunning = false;
                    songSelect.show();
                };
            }
        });

        // Update volume handler
        window.updateVolumes = async function() {
            const songVolumeSlider = document.getElementById('songVolumeSlider');
            const hitSoundVolumeSlider = document.getElementById('hitSoundVolumeSlider');
            const songVolumeValue = document.getElementById('songVolumeValue');
            const hitSoundVolumeValue = document.getElementById('hitSoundVolumeValue');

            // Update global state
            window.volumeState.songVolume = songVolumeSlider.value / 100;
            window.volumeState.hitSoundVolume = hitSoundVolumeSlider.value / 100;

            // Update display
            songVolumeValue.textContent = `${songVolumeSlider.value}%`;
            hitSoundVolumeValue.textContent = `${hitSoundVolumeSlider.value}%`;

            // Update game manager if it exists
            if (window.gameManager) {
                window.gameManager.setSongVolume(window.volumeState.songVolume);
                window.gameManager.setHitSoundVolume(window.volumeState.hitSoundVolume);
            }

            // Save to PlayerDataManager
            await playerData.saveVolumeSettings(window.volumeState);
        };

    } catch (error) {
        console.error('Error initializing game:', error);
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = '24px nunito';
        ctx.fillStyle = 'red';
        ctx.textAlign = 'center';
        ctx.fillText('Error loading game resources', canvas.width / 2, canvas.height / 2);
    }
};