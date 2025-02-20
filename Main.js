window.onload = async function() {
    const canvas = document.getElementById('gameWorld');
    const ctx = canvas.getContext('2d');

    // Show loading screen
    function drawLoadingScreen(progress) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = '40px nunito';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('Loading Songs...', canvas.width / 2, canvas.height / 2 - 50);

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
        // Initialize song loader
        const songLoader = new SongLoader();

        // Show loading progress
        songLoader.loadingProgress = 0;
        drawLoadingScreen(0);

        // Load all songs
        await songLoader.loadAllSongs();

        // Initialize song selection UI
        const songSelect = new SongSelectUI(canvas, songLoader);

        // Show song selection screen
        songSelect.show();

        // Handle keyboard input for song selection
        document.addEventListener('keydown', (event) => {
            const selectedSong = songSelect.handleInput(event);

            if (selectedSong) {
                // Hide song selection UI
                songSelect.hide();

                // Create game manager with selected song
                window.gameManager = new GameManager(selectedSong.data);
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