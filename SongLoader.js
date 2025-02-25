class SongLoader {
    constructor() {
        this.songs = [];
        this.isLoading = false;
        this.loadingProgress = 0;
    }

    // List of all available songs
    static songList = [
        { id: 'laundry', title: 'Laundry', path: './songs/Laundry.osu'},
        { id: 'ketamine', title: 'Ketamine', path: './songs/Ketamine.osu'},
        { id: 'astrid', title: 'Astrid', path: './songs/Astrid.osu'},
        { id: 'bbl_drizzy', title: 'BBL Drizzy', path: './songs/BBL_DRIZZY.osu'},
        { id: 'good_loyal', title: 'Good Loyal Thots', path: './songs/Good_Loyal_Thots.osu'},
        { id: 'rickyyyy', title: 'Ricky Bobby', path: './songs/Ricky_Bobby.osu'},
        { id: 'grave', title: 'Grave', path: './songs/Grave.osu'},
        { id: 'marlboro', title: 'Marlboro Nights', path: './songs/Marlboro_Nights.osu'},
        { id: 'everything_black', title: 'Everything Black', path: './songs/Everything_Black.osu'},
        { id: 'tsunami', title: 'Tsunami', path: './songs/Tsunami.osu'},
        { id: 'de_inferno', title: 'Carcelera', path: './songs/Carcelera.osu'},
        { id: 'paranoia', title: 'Paranoia', path: './songs/KENTENSHI_paranoia.osu'},
        { id: 'glaza', title: 'Glaza', path: './songs/Glaza.osu'},
        { id: 'navsegda', title: 'Navsegda', path: './songs/Navsegda.osu'},
        { id: 'risuyu_krovyu', title: 'Risuyu Krovyu', path: './songs/Risuyu_Krovyu.osu'},
        { id: 'dance_cap', title: 'Dance Cap', path: './songs/DanceCap.osu'},
        { id: 'spiral', title: 'Spiral', path: './songs/Spiral.osu'},
        { id: 'shikanoko', title: 'Shikanoko Remix', path: './songs/Shikanoko_Remix.osu'},
        { id: 'hikari', title: 'Hikari', path: './songs/Hikari.osu'},
        { id: 'otonoke', title: 'Otonoke', path: './songs/Otonoke.osu'},
        { id: 'into_world', title: 'Into the World', path: './songs/Into_the_world.osu'},
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