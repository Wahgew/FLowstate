window.onload = async function() {
    const canvas = document.getElementById('gameWorld');

    try {
        const response = await fetch('./songs/DanceCap.osu');
        const osuContent = await response.text();
        const songData = loadOsuFile(osuContent);

        // Create game manager with the parsed song data
        window.gameManager = new GameManager(songData);
    } catch (error) {
        console.error('Error loading .osu file:', error);
        // Optionally fall back to default song data
        window.gameManager = new GameManager();
    }
};