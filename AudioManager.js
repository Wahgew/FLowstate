// export class AudioManager {
//     constructor() {
//         this.audio = new Audio();
//         this.startTime = 0;
//         this.isPlaying = false;
//     }
//
//     // loadSong(songPath) {
//     //     return new Promise((resolve, reject) => {
//     //         this.audio.src = songPath;
//     //         this.audio.addEventListener('canplaythrough', resolve);
//     //         this.audio.addEventListener('error', reject);
//     //     });
//     // }
//
//     loadSong(songPath) {
//         return Promise.resolve();
//     }
//
//     play() {
//         this.startTime = Date.now();
//         //this.audio.play();
//         this.isPlaying = true;
//     }
//
//     pause() {
//         //this.audio.pause();
//         this.isPlaying = false;
//     }
//
//     getCurrentTime() {
//         return this.isPlaying ? Date.now() - this.startTime : 0;
//     }
// }