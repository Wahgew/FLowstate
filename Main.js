window.onload = async function() {
    const canvas = document.getElementById('gameWorld');
    const ctx = canvas.getContext('2d');

    // Show loading screen
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
        // Initialize PlayerDataManager first (it's lightweight and needed for displaying grades)
        const playerData = new PlayerDataManager();
        // Make playerDataManager available globally for the reset button
        window.playerDataManager = playerData;
        await playerData.initializeDB();

        // Initialize song loader
        const songLoader = new SongLoader();
        drawLoadingScreen(0, 'Loading Songs...');
        await songLoader.loadAllSongs();

        // Load all player records
        drawLoadingScreen(50, 'Loading Player Data...');
        const playerRecords = await playerData.getAllRecords();

        // Initialize song selection UI with both song and player data
        const songSelect = new SongSelectUI(canvas, songLoader, playerData);

        // Show song selection screen
        songSelect.show();

        // Handle keyboard input for song selection
        document.addEventListener('keydown', (event) => {
            const selectedSong = songSelect.handleInput(event);

            if (selectedSong) {
                // Hide song selection UI
                songSelect.hide();

                // Create game manager with selected song info and player data
                window.gameManager = new GameManager({
                    id: selectedSong.id,
                    data: selectedSong.data
                }, playerData);
                window.gameManager.setHitSoundVolume(0.4);
                window.gameManager.setSongVolume(0.5);

                // Add callback for returning to song selection
                window.gameManager.onSongSelect = () => {
                    window.gameManager.music.pause();
                    window.gameManager.music.currentTime = 0;
                    window.gameManager.isRunning = false;
                    songSelect.show();
                };
            }
        });
    } catch (error) {
        console.error('Error initializing game:', error);
        // Show error message on canvas
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = '24px nunito';
        ctx.fillStyle = 'red';
        ctx.textAlign = 'center';
        ctx.fillText('Error loading game resources', canvas.width / 2, canvas.height / 2);
    }
};