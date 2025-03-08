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
        { id: 'interlude', title: 'Interlude', difficulty: 1.0, path: './songs/Interlude.osu'},
        { id: 'nobiru', title: 'Nobiru Type Nandesu', difficulty: 1.0, path: './songs/Nobiru_Type_Nandesu.osu'},
        { id: 'applause', title: 'Applause', difficulty: 2.0, path: './songs/Applause.osu'},
        { id: 'collage', title: 'Collage', difficulty: 3.0, path: './songs/Collage.osu'},
        { id: 'orange_file', title: 'Orange File', difficulty: 3.0, path: './songs/Orange_File.osu'},
        { id: 'minor_piece', title: 'Minor Piece', difficulty: 1.0, path: './songs/Minor_Piece.osu'},
        { id: 'freedom_dive', title: 'FREEDOM DiVE', difficulty: 1.0, path: './songs/FREEDOM_DiVE.osu'},
        { id: 'introduction', title: 'Introduction', difficulty: 1.0, path: './songs/introduction.osu'},
        { id: 'funk_infernal', title: 'FUNK INFERNAL', difficulty: 3.0, path: './songs/FUNK_INFERNAL.osu'},
        { id: 'snuggle_song', title: 'Snugglesong', difficulty: 4.0, path: './songs/Snugglesong.osu'},
        { id: 'among_trees', title: 'Tussle Among Trees', difficulty: 1.0, path: './songs/Tussle_Among_Trees.osu'},
        { id: 'the_light', title: 'The Light', difficulty: 1.0, path: './songs/the_light.osu'},
        { id: 'mizuoto_curtain', title: 'Mizuoto to Curtain', difficulty: 1.0, path: './songs/Mizuoto_to_Curtain.osu'},
        { id: 'lonely_go', title: 'Lonely Go!', difficulty: 2.0, path: './songs/Lonely_Go.osu'},
        { id: 'snowman', title: 'Snowman', difficulty: 2.0, path: './songs/Snowman.osu'},
        { id: '757', title: '757 Remix', difficulty: 3.0, path: './songs/757.osu'},
        { id: 'hana_natte', title: 'Hana ni Natte', difficulty: 5.0, path: './songs/Hana_ni_Natte.osu'},
        { id: 'unwelcome_school', title: 'Unwelcome School', difficulty: 4.0, path: './songs/Unwelcome_School.osu'},
        { id: 'cant_say_it_back', title: 'Can\'t Say It Back', difficulty: 3.0, path: './songs/Cant_Say_It_Back.osu'},
        { id: 'by_your_side', title: 'By Your Side', difficulty: 2.0, path: './songs/By_Your_Side.osu'},
        { id: 'think_abt_it', title: 'Think Abt It', difficulty: 1.0, path: './songs/think_abt_it.osu'},
        { id: 'hawatari_nioku_centi', title: 'HAWATARI NIOKU', difficulty: 1.0, path: './songs/HAWATARI_NIOKU_CENTI.osu'},
        { id: 'rocket_to_your_heart', title: 'Rocket to Your Heart', difficulty: 2.0, path: './songs/fly_a_rocket_to_your_heart.osu'},
        { id: 'drive_real_fast', title: 'Drive Real Fast', difficulty: 1.0, path: './songs/drive_real_fast.osu'},
        { id: 'beyond', title: 'BEYOND', difficulty: 1.0, path: './songs/BEYOND.osu'},
        { id: 'valkyrius0', title: 'Valkyrius0', difficulty: 2.0, path: './songs/Valkyrius0.osu'},
        { id: 'bones', title: 'Bones', difficulty: 1.0, path: './songs/Bones.osu'},



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