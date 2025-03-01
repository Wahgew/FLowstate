// depreciated and will never be used.
// out of respect of the time I spend hard coding the notes
// this is kept in due of the time spent on it.
/*
// // songData.js
// const exampleSong = {
//     title: "Test Song",
//     sheet: [
//         {   // S lane
//             notes: [
//                 { delay: 1 },
//                 { delay: 2 },// Will spawn higher up
//                 { delay: 3 },
//                 { delay: 4 },
//                 { delay: 5 },
//             ]
//         },
//         {   // D lane
//             notes: [
//                 { delay: 2 },
//             ]
//         },
//         {   // K lane
//             notes: [
//                 { delay: 7 },
//             ]
//         },
//         {   // L lane
//             notes: [
//                 { delay: 12 },
//             ]
//         }
//     ]
// };
//
// const map = {
//     songPath: 'songs/Shine_or_Die_Ftlframe.mp3',
//     sheet: [
//         {
//             // lane s
//             notes: [
//                 //left
//                 {delay: 2.1},
//                 {delay: 2.6},
//                 {delay: 3.4},
//
//                 //right
//                 {delay: 4.7},
//                 {delay: 5.5},
//                 {delay: 6.3},
//
//                 //left
//                 {delay: 6.5},
//                 {delay: 7.3},
//                 {delay: 8.1},
//
//                 //right
//                 {delay: 9.5},
//                 {delay: 10.3},
//                 {delay: 11.1},
//
//
//                 //left
//                 {delay: 11.3},
//                 {delay: 12.1},
//                 {delay: 12.9},
//
//                 //right
//                 {delay: 14.3},
//                 {delay: 15.1},
//                 {delay: 15.9},
//
//                 // Chorus
//                 {delay: 17.5},
//                 {delay: 17.6},
//                 {delay: 17.7},
//                 {delay: 19.5},
//                 {delay: 19.6},
//                 {delay: 19.7},
//                 {delay: 22.1},
//                 {delay: 22.2},
//                 {delay: 22.3},
//                 {delay: 24.2},
//                 {delay: 24.3},
//                 {delay: 24.4},
//                 {delay: 26.5},
//                 {delay: 26.6},
//                 {delay: 26.7},
//                 {delay: 29.1},
//                 {delay: 29.2},
//                 {delay: 29.3},
//                 {delay: 31.1},
//                 {delay: 31.2},
//                 {delay: 31.3},
//                 {delay: 33.5},
//                 {delay: 33.6},
//                 {delay: 33.7},
//                 {delay: 35.7},
//                 {delay: 35.8},
//                 {delay: 35.9},
//
//
//                 {delay: 38.1},
//                 {delay: 38.2},
//                 {delay: 38.3},
//                 {delay: 40.5},
//                 {delay: 40.6},
//                 {delay: 40.7},
//                 {delay: 42.7},
//                 {delay: 42.8},
//                 {delay: 42.9},
//
//                 {delay: 45.1},
//                 {delay: 45.2},
//                 {delay: 45.3},
//
//                 {delay: 47.5},
//                 {delay: 47.6},
//                 {delay: 47.7},
//
//                 {delay: 49.5},
//                 {delay: 49.6},
//                 {delay: 49.7},
//
//                 {delay: 52.1},
//                 {delay: 52.2},
//                 {delay: 52.3},
//
//                 //ending
//                 {delay: 53.5},
//                 {delay: 53.6},
//
//                 {delay: 53.8},
//                 {delay: 54},
//
//                 {delay: 54.2},
//                 {delay: 54.3},
//
//
//                 {delay: 55.6},
//                 {delay: 55.7},
//
//                 {delay: 56},
//                 {delay: 56.1},
//
//                 {delay: 56.4},
//                 {delay: 56.5},
//
//                 {delay: 56.8},
//                 {delay: 56.9},
//             ]
//         },
//         {
//             // lane d
//             notes: [
//                 //left
//                 {delay: 2.2},
//                 {delay: 2.8},
//                 {delay: 3.6},
//
//                 //right
//                 {delay: 4.5},
//                 {delay: 5.3},
//                 {delay: 6.1},
//
//                 //left
//                 {delay: 6.7},
//                 {delay: 7.5},
//                 {delay: 8.3},
//
//                 //right
//                 {delay: 9.3},
//                 {delay: 10.1},
//                 {delay: 10.9},
//
//                 //left
//                 {delay: 11.5},
//                 {delay: 12.3},
//                 {delay: 13.1},
//
//                 //right
//                 {delay: 14.1},
//                 {delay: 14.9},
//                 {delay: 15.7},
//
//                 // Chorus
//                 {delay: 16.5},
//                 {delay: 16.6},
//                 {delay: 16.7},
//                 {delay: 18.5},
//                 {delay: 18.6},
//                 {delay: 18.7},
//                 {delay: 20.7},
//                 {delay: 20.8},
//                 {delay: 20.9},
//                 {delay: 23.1},
//                 {delay: 23.2},
//                 {delay: 23.3},
//                 {delay: 25.5},
//                 {delay: 25.6},
//                 {delay: 25.7},
//                 {delay: 27.7},
//                 {delay: 27.8},
//                 {delay: 27.9},
//                 {delay: 30.1},
//                 {delay: 30.2},
//                 {delay: 30.3},
//                 {delay: 32.5},
//                 {delay: 32.6},
//                 {delay: 32.7},
//                 {delay: 34.5},
//                 {delay: 34.6},
//                 {delay: 34.7},
//                 {delay: 37.1},
//                 {delay: 37.2},
//                 {delay: 37.3},
//
//                 {delay: 39.1},
//                 {delay: 39.2},
//                 {delay: 39.3},
//
//                 {delay: 41.5},
//                 {delay: 41.6},
//                 {delay: 41.7},
//
//                 {delay: 43.7},
//                 {delay: 43.8},
//                 {delay: 43.9},
//
//                 {delay: 46.1},
//                 {delay: 46.2},
//                 {delay: 46.3},
//
//                 {delay: 48.5},
//                 {delay: 48.6},
//                 {delay: 48.7},
//
//                 {delay: 50.7},
//                 {delay: 50.8},
//                 {delay: 50.9},
//
//                 {delay: 53.1},
//                 {delay: 53.2},
//                 {delay: 53.3},
//
//                 //ending
//                 {delay: 53.5},
//                 {delay: 53.6},
//
//                 {delay: 53.8},
//                 {delay: 54},
//
//                 {delay: 54.2},
//                 {delay: 54.3},
//
//
//                 {delay: 55.6},
//                 {delay: 55.7},
//
//                 {delay: 56},
//                 {delay: 56.1},
//
//                 {delay: 56.4},
//                 {delay: 56.5},
//
//                 {delay: 56.8},
//                 {delay: 56.9},
//             ]
//         },
//         {
//             // lane k
//             notes: [
//                 //left
//                 {delay: 2.3},
//                 {delay: 3},
//                 {delay: 3.8},
//
//                 //right
//                 {delay: 4.3},
//                 {delay: 5.1},
//                 {delay: 5.9},
//
//                 //left
//                 {delay: 6.9},
//                 {delay: 7.7},
//                 {delay: 8.5},
//
//                 //right
//                 {delay: 9.1},
//                 {delay: 9.9},
//                 {delay: 10.7},
//
//                 //left
//                 {delay: 11.7},
//                 {delay: 12.5},
//                 {delay: 13.3},
//
//                 //right
//                 {delay: 13.9},
//                 {delay: 14.7},
//                 {delay: 15.5},
//
//                 // Chorus
//                 {delay: 16.5},
//                 {delay: 16.6},
//                 {delay: 16.7},
//                 {delay: 18.5},
//                 {delay: 18.6},
//                 {delay: 18.7},
//                 {delay: 20.7},
//                 {delay: 20.8},
//                 {delay: 20.9},
//                 {delay: 23.1},
//                 {delay: 23.2},
//                 {delay: 23.3},
//                 {delay: 25.5},
//                 {delay: 25.6},
//                 {delay: 25.7},
//                 {delay: 27.7},
//                 {delay: 27.8},
//                 {delay: 27.9},
//                 {delay: 30.1},
//                 {delay: 30.2},
//                 {delay: 30.3},
//                 {delay: 32.5},
//                 {delay: 32.6},
//                 {delay: 32.7},
//                 {delay: 34.5},
//                 {delay: 34.6},
//                 {delay: 34.7},
//                 {delay: 37.1},
//                 {delay: 37.2},
//                 {delay: 37.3},
//
//                 {delay: 39.1},
//                 {delay: 39.2},
//                 {delay: 39.3},
//
//                 {delay: 41.5},
//                 {delay: 41.6},
//                 {delay: 41.7},
//
//                 {delay: 43.7},
//                 {delay: 43.8},
//                 {delay: 43.9},
//
//                 {delay: 46.1},
//                 {delay: 46.2},
//                 {delay: 46.3},
//
//                 {delay: 48.5},
//                 {delay: 48.6},
//                 {delay: 48.7},
//
//                 {delay: 50.7},
//                 {delay: 50.8},
//                 {delay: 50.9},
//
//                 {delay: 53.1},
//                 {delay: 53.2},
//                 {delay: 53.3},
//
//                 //ending
//                 {delay: 53.5},
//                 {delay: 53.6},
//
//                 {delay: 53.8},
//                 {delay: 54},
//
//                 {delay: 54.2},
//                 {delay: 54.3},
//
//
//                 {delay: 55.6},
//                 {delay: 55.7},
//
//                 {delay: 56},
//                 {delay: 56.1},
//
//                 {delay: 56.4},
//                 {delay: 56.5},
//
//                 {delay: 56.8},
//                 {delay: 56.9},
//             ]
//         },
//         {
//             // lane l
//             notes: [
//                 //left
//                 {delay: 2.4},
//                 {delay: 3.2},
//                 {delay: 3.9},
//
//                 //right
//                 {delay: 4.1},
//                 {delay: 4.9},
//                 {delay: 5.7},
//
//                 //left
//                 {delay: 7.1},
//                 {delay: 7.9},
//                 {delay: 8.7},
//
//                 //right
//                 {delay: 8.9},
//                 {delay: 9.7},
//                 {delay: 10.5},
//
//                 //left
//                 {delay: 11.9},
//                 {delay: 12.7},
//                 {delay: 13.5},
//
//                 //right
//                 {delay: 13.7},
//                 {delay: 14.5},
//                 {delay: 15.3},
//
//                 // Chorus
//                 {delay: 17.5},
//                 {delay: 17.6},
//                 {delay: 17.7},
//                 {delay: 19.5},
//                 {delay: 19.6},
//                 {delay: 19.7},
//                 {delay: 22.1},
//                 {delay: 22.2},
//                 {delay: 22.3},
//                 {delay: 24.2},
//                 {delay: 24.3},
//                 {delay: 24.4},
//                 {delay: 26.5},
//                 {delay: 26.6},
//                 {delay: 26.7},
//                 {delay: 29.1},
//                 {delay: 29.2},
//                 {delay: 29.3},
//                 {delay: 31.1},
//                 {delay: 31.2},
//                 {delay: 31.3},
//                 {delay: 33.5},
//                 {delay: 33.6},
//                 {delay: 33.7},
//                 {delay: 35.7},
//                 {delay: 35.8},
//                 {delay: 35.9},
//
//
//                 {delay: 38.1},
//                 {delay: 38.2},
//                 {delay: 38.3},
//                 {delay: 40.5},
//                 {delay: 40.6},
//                 {delay: 40.7},
//                 {delay: 42.7},
//                 {delay: 42.8},
//                 {delay: 42.9},
//
//                 {delay: 45.1},
//                 {delay: 45.2},
//                 {delay: 45.3},
//
//                 {delay: 47.5},
//                 {delay: 47.6},
//                 {delay: 47.7},
//
//                 {delay: 49.5},
//                 {delay: 49.6},
//                 {delay: 49.7},
//
//                 {delay: 52.1},
//                 {delay: 52.2},
//                 {delay: 52.3},
//
//                 //ending
//                 {delay: 53.5},
//                 {delay: 53.6},
//
//                 {delay: 53.8},
//                 {delay: 54},
//
//                 {delay: 54.2},
//                 {delay: 54.3},
//
//
//                 {delay: 55.6},
//                 {delay: 55.7},
//
//                 {delay: 56},
//                 {delay: 56.1},
//
//                 {delay: 56.4},
//                 {delay: 56.5},
//
//                 {delay: 56.8},
//                 {delay: 56.9},
//             ]
//         }
//     ]
// };
*/