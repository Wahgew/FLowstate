import { testMaps } from './TestMaps.js';
import { GameManager } from './GameManager.js';

// Setup canvas resize for different monitor size
function resizeCanvas() {
    const canvas = document.getElementById('gameWorld');
    const aspect = 16 / 9;
    let width = window.innerWidth - 4;
    let height = window.innerHeight - 4;

    if (width / height > aspect) {
        width = height * aspect;
    } else {
        height = width / aspect;
    }

    canvas.width = width;
    canvas.height = height;

    // Reinitialize if the game manager exists and we're not in initial setup
    // if (window.gameManager && window.gameManager.isRunning) {
    //     gameManager.initialize();
    // }
}

function loadCurrentMap() {
    return new Promise((resolve, reject) => {
        try {
            // Load the test map, then resolve the promise
            gameManager.loadSong(testMaps.sheet);
            resolve();
        } catch (error) {
            reject('Error loading song map');
        }
    });
}


async function initializeGame() {
    // Resize first
    resizeCanvas();

    window.gameManager = new GameManager();

    gameManager.canvas = document.getElementById('gameWorld');
    gameManager.ctx = gameManager.canvas.getContext('2d');

    try {
        await loadCurrentMap();  // Wait for the song data to load
        gameManager.initialize(); // Initialize after song is loaded
    } catch (error) {
        console.error('Failed to initialize game:', error);
    }

    // Add restart listener
    document.addEventListener('keydown', (event) => {
        if (event.key === 'r') {
            loadCurrentMap();
        }
    });
}

// Add resize listener
window.addEventListener('resize', resizeCanvas);

// Wait for everything to load before starting
window.addEventListener('load', initializeGame);