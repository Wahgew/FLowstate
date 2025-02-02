// const canvas = document.getElementById('gameWorld');
//
// // Function to resize the canvas to fit the window size
// function resizeCanvas() {
//     const aspect = 16 / 9; // force 16:9 aspect ratio
//     let width = window.innerWidth - 4;
//     let height = window.innerHeight - 4;
//
//
//
//     if (width / height > aspect) {
//         width = height * aspect;
//     } else {
//         height = width / aspect;
//     }
//
//     canvas.width = width;
//     canvas.height = height;
//
//     if (window.gameManager && window.gameManager.isRunning) {
//         gameManager.initialize();  // Reinitialize game with updated canvas size
//     }
// }
//
// // resize listener
// window.addEventListener('resize', resizeCanvas);
//
// // // give time to load
// // window.addEventListener('load', ininitializeGame)