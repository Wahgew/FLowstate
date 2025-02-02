window.onload = function() {
    const canvas = document.getElementById('gameWorld');
    const game = new GameManager();

    function resizeCanvas() {
        const aspect = 16 / 9; // force 16:9 aspect ratio
        let width = window.innerWidth - 2;
        let height = window.innerHeight - 2;

        if (width / height > aspect) {
            width = height * aspect;
        } else {
            height = width / aspect;
        }

        canvas.width = width;
        canvas.height = height;

        if (game) {
            game.initialize();  // Reinitialize game with updated canvas size
        }
    }

    //window.addEventListener('resize', resizeCanvas);
    //resizeCanvas();
};