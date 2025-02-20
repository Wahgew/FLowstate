// UI Class to handle the song selection screen
class SongSelectUI {
    constructor(canvas, songLoader) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.songLoader = songLoader;
        this.selectedIndex = 0;
        this.isVisible = false;

        // Basic UI constants
        this.songBoxWidth = 400;
        this.songBoxHeight = 80;
        this.spacing = 20;
    }

    show() {
        this.isVisible = true;
        this.draw();
    }

    hide() {
        this.isVisible = false;
    }

    draw() {
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

            // Draw box
            this.ctx.fillStyle = index === this.selectedIndex ? '#444' : '#222';
            this.ctx.fillRect(
                (this.canvas.width - this.songBoxWidth) / 2,
                y,
                this.songBoxWidth,
                this.songBoxHeight
            );

            // Draw song title
            this.ctx.fillStyle = 'white';
            this.ctx.font = '24px nunito';
            this.ctx.fillText(
                song.title,
                this.canvas.width / 2,
                y + (this.songBoxHeight / 2)
            );
        });

        // Draw instructions
        this.ctx.font = '20px nunito';
        const instructions = [
            '↑↓ to select, ENTER to play, F2 for debug mode',
            'Controls: S D | J K',
            'Hold R for 1-3 seconds to restart song',
            'In debug mode, R returns to song selection'
        ];

        instructions.forEach((text, index) => {
            this.ctx.fillText(text,
                this.canvas.width / 2,
                this.canvas.height - (80 - index * 25)
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