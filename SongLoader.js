class SongLoader {
    constructor() {
        this.songs = [];
        this.isLoading = false;
        this.loadingProgress = 0;
    }

    // List of all available songs
    static songList = [
        { id: 'dance_cap', title: 'Dance Cap', path: './songs/DanceCap.osu' },
        { id: 'paranoia', title: 'Paranoia', path: './songs/KENTENSHI_paranoia.osu' },
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