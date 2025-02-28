class SongLoader {
    constructor() {
        this.songs = [];
        this.isLoading = true;
        this.loadingProgress = 0;
        this.onProgressUpdate = null;
    }

    // List of all available songs
    static songList = [
        { id: 'laundry', title: 'Laundry', difficulty: 1.0, path: './songs/Laundry.osu'},
        { id: 'ketamine', title: 'Ketamine', difficulty: 3.0, path: './songs/Ketamine.osu'},
        { id: 'astrid', title: 'Astrid', difficulty: 2.0, path: './songs/Astrid.osu'},
        { id: 'bbl_drizzy', title: 'BBL Drizzy', difficulty: 2.0, path: './songs/BBL_DRIZZY.osu'},
        { id: 'good_loyal', title: 'Good Loyal Thots', difficulty: 2.0, path: './songs/Good_Loyal_Thots.osu'},
        { id: 'rickyyyy', title: 'Ricky Bobby', difficulty: 3.0, path: './songs/Ricky_Bobby.osu'},
        { id: 'grave', title: 'Grave', difficulty: 1.0, path: './songs/Grave.osu'},
        { id: 'marlboro', title: 'Marlboro Nights', difficulty: 4.0, path: './songs/Marlboro_Nights.osu'},
        { id: 'everything_black', title: 'Everything Black', difficulty: 5.0, path: './songs/Everything_Black.osu'},
        { id: 'tsunami', title: 'Tsunami', difficulty: 2.0, path: './songs/Tsunami.osu'},
        { id: 'de_inferno', title: 'Carcelera', difficulty: 4.0, path: './songs/Carcelera.osu'},
        { id: 'paranoia', title: 'Paranoia', difficulty: 4.0, path: './songs/KENTENSHI_paranoia.osu'},
        { id: 'glaza', title: 'Glaza', difficulty: 3.0, path: './songs/Glaza.osu'},
        { id: 'navsegda', title: 'Navsegda', difficulty: 3.0, path: './songs/Navsegda.osu'},
        { id: 'risuyu_krovyu', title: 'Risuyu Krovyu', difficulty: 5.0, path: './songs/Risuyu_Krovyu.osu'},
        { id: 'dance_cap', title: 'Dance Cap', difficulty: 4.0, path: './songs/DanceCap.osu'},
        { id: 'spiral', title: 'Spiral', difficulty: 3.0, path: './songs/Spiral.osu'},
        { id: 'shikanoko', title: 'Shikanoko Remix', difficulty: 3.0, path: './songs/Shikanoko_Remix.osu'},
        { id: 'hikari', title: 'Hikari', difficulty: 3.0, path: './songs/Hikari.osu'},
        { id: 'otonoke', title: 'Otonoke', difficulty: 2.0, path: './songs/Otonoke.osu'},
        { id: 'into_world', title: 'Into the World', difficulty: 2.0, path: './songs/Into_the_world.osu'},
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

                this.songs.push({
                    ...song,
                    data: songData
                });

                this.loadingProgress = ((i + 1) / totalSongs) * 100;

                // Report progress if callback exists
                if (typeof this.onProgressUpdate === 'function') {
                    this.onProgressUpdate(this.loadingProgress);
                }
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