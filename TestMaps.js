// Note map testing
export const testMaps = {
    // Simple test with one note per lane
    basicTest: {
        title: "Basic Test",
        notes: [
            { lane: 0, time: 1000 },  // S lane
            { lane: 1, time: 2000 },  // D lane
            { lane: 2, time: 3000 },  // K lane
            { lane: 3, time: 4000 },  // L lane
        ]
    },

    // Test with hold notes
    holdTest: {
        title: "Hold Notes Test",
        notes: [
            { lane: 0, time: 1000, duration: 1000 },  // Hold S for 1 second
            { lane: 1, time: 3000 },                  // Regular note on D
            { lane: 2, time: 4000, duration: 2000 },  // Hold K for 2 seconds
            { lane: 3, time: 5000 }                   // Regular note on L
        ]
    },

    // More complex pattern
    patternTest: {
        title: "Pattern Test",
        notes: [
            // Alternating pattern
            { lane: 0, time: 1000 },
            { lane: 2, time: 1500 },
            { lane: 1, time: 2000 },
            { lane: 3, time: 2500 },
            // Hold note section
            { lane: 0, time: 3000, duration: 1000 },
            { lane: 1, time: 3500 },
            { lane: 2, time: 4000, duration: 1000 },
            { lane: 3, time: 4500 }
        ]
    },

    sheet: [
        {   // S lane
            notes: [
                { delay: 1 },  // This will start the note 1 second into the song
                { delay: 3 },
                { delay: 5 }
            ]
        },
        {   // D lane
            notes: [
                { delay: 2 },
                { delay: 4 },
                { delay: 6 }
            ]
        },
        {   // k lane
            notes: [
                { delay: 7 },
                { delay: 9 },
                { delay: 10 }
            ]
        },
        {   // l lane
            notes: [
                { delay: 12 },
                { delay: 13 },
                { delay: 15 },
                { delay: 16.5 },
                { delay: 17.5 },
                { delay: 18.5 },
                { delay: 19.5 },

            ]
        },
    ]
};