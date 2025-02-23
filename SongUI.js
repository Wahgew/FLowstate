class SongSelectUI {
    constructor(canvas, songLoader, playerDataManager) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.songLoader = songLoader;
        this.playerDataManager = playerDataManager;
        this.selectedIndex = 0;
        this.isVisible = false;
        this.songRecords = new Map(); // Cache for song records

        // Basic UI constants
        this.songBoxWidth = 400;
        this.songBoxHeight = 80;
        this.spacing = 20;

        // Load all song records when initializing
        this.loadSongRecords();
    }

    async loadSongRecords() {
        try {
            const records = await this.playerDataManager.getAllRecords();
            this.songRecords.clear();
            records.forEach(record => {
                this.songRecords.set(record.songId, record);
            });
        } catch (error) {
            console.error('Failed to load song records:', error);
        }
    }

    show() {
        this.isVisible = true;
        this.loadSongRecords().then(() => this.draw());
    }

    hide() {
        this.isVisible = false;
    }

    async draw() {
        if (!this.isVisible) return;

        // Clear canvas
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw title
        this.ctx.font = '40px nunito';
        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Song Selection', this.canvas.width / 2, 60);

        // Draw song boxes
        const songs = this.songLoader.getAllSongs();
        const startY = 120;

        songs.forEach((song, index) => {
            const y = startY + (index * (this.songBoxHeight + this.spacing));
            const record = this.songRecords.get(song.id);

            // Draw box background
            this.ctx.fillStyle = index === this.selectedIndex ? '#444' : '#222';
            this.ctx.fillRect(
                (this.canvas.width - this.songBoxWidth) / 2,
                y,
                this.songBoxWidth,
                this.songBoxHeight
            );

            // Set up text positions
            const boxCenterX = this.canvas.width / 2;
            const boxLeft = boxCenterX - (this.songBoxWidth / 2);
            const boxRight = boxCenterX + (this.songBoxWidth / 2);

            // Draw FC marker on left if achieved
            this.ctx.font = '40px nunito';
            this.ctx.textAlign = 'left';
            if (record?.isFullCombo) {
                this.ctx.fillStyle = '#FFD700'; // Gold color for FC
                this.ctx.fillText('FC✦', boxLeft + 10, y + (this.songBoxHeight / 2) + 8);
            }

            // Draw song title in center
            this.ctx.fillStyle = 'white';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(song.title, boxCenterX, y + (this.songBoxHeight / 2) + 8);

            // Draw grade on right if exists
            this.ctx.font = '40px nunito';
            this.ctx.textAlign = 'right';
            if (record) {
                this.ctx.fillStyle = this.playerDataManager.getGradeColor(record.grade);
                this.ctx.fillText(record.grade, boxRight - 10, y + (this.songBoxHeight / 2) + 8);
            } else {
                this.ctx.fillStyle = '#666';
                this.ctx.fillText('-', boxRight - 10, y + (this.songBoxHeight / 2) + 8);
            }
        });

        // Draw instructions
        this.ctx.font = '20px nunito';
        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'center';
        const instructions = [
            '↑↓ to select, ENTER to play, F2 for debug mode',
            'Controls: S D | J K',
            'Hold R for 1 second to restart song',
            'IT IS HIGHLY RECOMMEND TO PLAY ON FULLSCREEN',
            'As this gives you best hit detection',
        ];

        instructions.forEach((text, index) => {
            this.ctx.fillText(text,
                this.canvas.width / 2,
                this.canvas.height - (105 - index * 25)
            );
        });
    }

    handleInput(event) {
        if (!this.isVisible) return;

        const songs = this.songLoader.getAllSongs();

        switch(event.key) {
            case 'ArrowUp':
                this.selectedIndex = (this.selectedIndex - 1 + songs.length) % songs.length;
                this.draw();
                break;
            case 'ArrowDown':
                this.selectedIndex = (this.selectedIndex + 1) % songs.length;
                this.draw();
                break;
            case 'Enter':
                return songs[this.selectedIndex];
        }

        return null;
    }
}