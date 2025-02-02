// import { Note, HoldNote } from './Note.js';
//
// class SongMap {
//     constructor(songData) {
//         this.songData = songData;
//         this.notes = [];
//         this.currentIndex = 0;
//         this.initialize();
//     }
//
//     initialize() {
//         this.songData.notes.forEach(noteData => {
//             const note = noteData.duration
//                 ? new HoldNote(noteData.lane, noteData.time, noteData.duration, noteData.speed)
//                 : new Note(noteData.lane, noteData.time, noteData.speed);
//             this.notes.push(note);
//         });
//
//         // Sort notes by start time
//         this.notes.sort((a, b) => a.startTime - b.startTime);
//     }
//
//     getCurrentNotes(currentTime, ahead = 2000) {
//         // Return all notes that should be visible within the next 2 seconds
//         return this.notes.filter(note =>
//             note.isActive &&
//             note.startTime >= currentTime &&
//             note.startTime <= currentTime + ahead
//         );
//     }
// }
//
// // // Example song data format
// // const exampleSong = {
// //     title: "Example Song",
// //     bpm: 120,
// //     offset: 0,
// //     notes: [
// //         { lane: 0, time: 1000, speed: 2 },                    // Regular note
// //         { lane: 1, time: 2000, duration: 500, speed: 2 },     // Hold note
// //         { lane: 2, time: 3000, speed: 2 },                    // Regular note
// //         { lane: 3, time: 4000, duration: 1000, speed: 2 },    // Hold note
// //     ]
// // };
//
// export { SongMap };