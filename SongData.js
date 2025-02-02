// songData.js
const exampleSong = {
    title: "Test Song",
    sheet: [
        {   // S lane
            notes: [
                { delay: 1 },
                { delay: 2 },// Will spawn higher up
                { delay: 3 },
                { delay: 4 },
                { delay: 5 },
            ]
        },
        {   // D lane
            notes: [
                { delay: 2 },
            ]
        },
        {   // K lane
            notes: [
                { delay: 7 },
            ]
        },
        {   // L lane
            notes: [
                { delay: 12 },
            ]
        }
    ]
};

const map = {
    songPath: 'songs/Shine_or_Die_Ftlframe.mp3',
    sheet: [
        {
            // lane s
            notes: [
                //left
                {delay: 2.1},
                {delay: 2.6},
                {delay: 3.4},

                //right
                {delay: 4.7},
                {delay: 5.5},
                {delay: 6.3},

                // Chorus
                {delay: 17.5},
                {delay: 17.6},
                {delay: 17.7},
                {delay: 19.5},
                {delay: 19.6},
                {delay: 19.7},
                {delay: 22.1},
                {delay: 22.2},
                {delay: 22.3},
                {delay: 24.2},
                {delay: 24.3},
                {delay: 24.4},
            ]
        },
        {
            // lane d
            notes: [
                //left
                {delay: 2.2},
                {delay: 2.8},
                {delay: 3.6},

                //right
                {delay: 4.5},
                {delay: 5.3},
                {delay: 6.1},

                // Chorus
                {delay: 16.5},
                {delay: 16.6},
                {delay: 16.7},
                {delay: 18.5},
                {delay: 18.6},
                {delay: 18.7},
                {delay: 20.7},
                {delay: 20.8},
                {delay: 20.9},
                {delay: 23.1},
                {delay: 23.2},
                {delay: 23.3},
            ]
        },
        {
            // lane k
            notes: [
                //left
                {delay: 2.3},
                {delay: 3},
                {delay: 3.8},

                //right
                {delay: 4.3},
                {delay: 5.1},
                {delay: 5.9},

                // Chorus
                {delay: 16.5},
                {delay: 16.6},
                {delay: 16.7},
                {delay: 18.5},
                {delay: 18.6},
                {delay: 18.7},
                {delay: 20.7},
                {delay: 20.8},
                {delay: 20.9},
                {delay: 23.1},
                {delay: 23.2},
                {delay: 23.3},
            ]
        },
        {
            // lane l
            notes: [
                //left
                {delay: 2.4},
                {delay: 3.1},
                {delay: 3.9},

                //right
                {delay: 4.1},
                {delay: 4.9},
                {delay: 5.7},

                // Chorus
                {delay: 17.5},
                {delay: 17.6},
                {delay: 17.7},
                {delay: 19.5},
                {delay: 19.6},
                {delay: 19.7},
                {delay: 22.1},
                {delay: 22.2},
                {delay: 22.3},
                {delay: 24.2},
                {delay: 24.3},
                {delay: 24.4},
            ]
        }
    ]
};