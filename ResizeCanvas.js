// Get the canvas element
const canvas = document.getElementById('gameWorld');

// Function to resize the canvas to fit the window size
function resizeCanvas() {
    const aspect = 16 / 9; // force 16:9 aspect ratio
    let width = window.innerWidth - 4;
    let height = window.innerHeight - 4;



    if (width / height > aspect) {
        width = height * aspect;
    } else {
        height = width / aspect;
    }

    canvas.width = width;
    canvas.height = height;

    if (gameManager) {
        gameManager.initialize();  // Reinitialize game with updated canvas size
    }
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();