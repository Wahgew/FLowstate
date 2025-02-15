window.onload = async function() {
    const canvas = document.getElementById('gameWorld');

    try {
        //const response = await fetch('./songs/DanceCap.osu');
        const response = await fetch('./songs/KENTENSHI_paranoia.osu');
        const osuContent = await response.text();
        const songData = loadOsuFile(osuContent);

        // Create game manager with the parsed song data
        window.gameManager = new GameManager(songData);
        window.gameManager.setHitSoundVolume(0.6);
        window.gameManager.setSongVolume(0.5);
    } catch (error) {
        console.error('Error loading .osu file:', error);
        // Optionally fall back to default song data
        window.gameManager = new GameManager();
    }
};