class SongLoader {
    constructor() {
        this.songs = [];
        this.isLoading = false;
        this.loadingProgress = 0;
    }

    // List of all available songs
    static songList = [
        { id: 'laundry', title: 'Laundry', difficulty: 2.0, path: './songs/Laundry.osu'},
        { id: 'ketamine', title: 'Ketamine', difficulty: 3.2, path: './songs/Ketamine.osu'},
        { id: 'astrid', title: 'Astrid', difficulty: 2.5, path: './songs/Astrid.osu'},
        { id: 'bbl_drizzy', title: 'BBL Drizzy', difficulty: 3.0, path: './songs/BBL_DRIZZY.osu'},
        { id: 'good_loyal', title: 'Good Loyal Thots', difficulty: 2.2, path: './songs/Good_Loyal_Thots.osu'},
        { id: 'rickyyyy', title: 'Ricky Bobby', difficulty: 2.8, path: './songs/Ricky_Bobby.osu'},
        { id: 'grave', title: 'Grave', difficulty: 2.4, path: './songs/Grave.osu'},
        { id: 'marlboro', title: 'Marlboro Nights', difficulty: 1.9, path: './songs/Marlboro_Nights.osu'}, // 3 star andrew
        { id: 'everything_black', title: 'Everything Black', difficulty: 3.7, path: './songs/Everything_Black.osu'},
        { id: 'tsunami', title: 'Tsunami', difficulty: 3.5, path: './songs/Tsunami.osu'},
        { id: 'de_inferno', title: 'Carcelera', difficulty: 3.1, path: './songs/Carcelera.osu'},
        { id: 'paranoia', title: 'Paranoia', difficulty: 4.0, path: './songs/KENTENSHI_paranoia.osu'},
        { id: 'glaza', title: 'Glaza', difficulty: 2.3, path: './songs/Glaza.osu'},
        { id: 'navsegda', title: 'Navsegda', difficulty: 2.7, path: './songs/Navsegda.osu'},
        { id: 'risuyu_krovyu', title: 'Risuyu Krovyu', difficulty: 3.3, path: './songs/Risuyu_Krovyu.osu'},
        { id: 'dance_cap', title: 'Dance Cap', difficulty: 2.0, path: './songs/DanceCap.osu'},
        { id: 'spiral', title: 'Spiral', difficulty: 4.5, path: './songs/Spiral.osu'},
        { id: 'shikanoko', title: 'Shikanoko Remix', difficulty: 2.9, path: './songs/Shikanoko_Remix.osu'},
        { id: 'hikari', title: 'Hikari', difficulty: 2.5, path: './songs/Hikari.osu'},
        { id: 'otonoke', title: 'Otonoke', difficulty: 3.4, path: './songs/Otonoke.osu'},
        { id: 'into_world', title: 'Into the World', difficulty: 3.2, path: './songs/Into_the_world.osu'},
        // Add difficulty ratings for all songs
    ];

    async loadAllSongs() {
        this.isLoading = true;
        this.loadingProgress = 0;

        try {
            const totalSongs = SongLoader.songList.length;

            for (let i = 0; i < totalSongs; i++) {
                const song = SongLoader.songList[i];
                const response = await fetch(song.path);
                const osuContent = await response.text();
                const songData = loadOsuFile(osuContent);

                // Use the calculated difficulty if available, otherwise use manual rating
                const difficulty = songData.difficulty || song.difficulty || 2.0;

                this.songs.push({
                    ...song,
                    difficulty: difficulty, // Use the calculated difficulty
                    data: songData
                });

                this.loadingProgress = ((i + 1) / totalSongs) * 100;
            }

            this.isLoading = false;
            return true;
        } catch (error) {
            console.error('Error loading songs:', error);
            this.isLoading = false;
            return false;
        }
    }


    getSongById(id) {
        return this.songs.find(song => song.id === id);
    }

    getAllSongs() {
        return this.songs;
    }
}