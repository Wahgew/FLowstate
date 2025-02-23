class SongLoader {
    constructor() {
        this.songs = [];
        this.isLoading = false;
        this.loadingProgress = 0;
    }

    // List of all available songs
    static songList = [
        { id: 'into_world', title: 'Into the World', path: './songs/Into_the_world.osu'},
        { id: 'bbl_drizzy', title: 'BBL Drizzy', path: './songs/BBL_DRIZZY.osu'},
        { id: 'good_loyal', title: 'Good Loyal Thots', path: './songs/Good_Loyal_Thots.osu'},
        { id: 'navsegda', title: 'Navsegda', path: './songs/Navsegda.osu'},
        { id: 'tsunami', title: 'Tsunami', path: './songs/Tsunami.osu'},
        { id: 'paranoia', title: 'Paranoia', path: './songs/KENTENSHI_paranoia.osu'},
        { id: 'glaza', title: 'Glaza', path: './songs/Glaza.osu'},
        { id: 'dance_cap', title: 'Dance Cap', path: './songs/DanceCap.osu'},
        // Add more songs here
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