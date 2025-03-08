class EndScreenUI {
    static GRADE_COLORS = {
        SS: '#FFB347', // Soft orange
        S: '#FF9B9B',  // Pastel coral/orange-red
        A: '#90EE90',  // Pastel green
        B: '#87CEEB',  // Pastel blue
        C: '#DDA0DD',  // Pastel purple
        D: '#FFB6C1',  // Pastel red
        F: '#808080'   // Gray for fail
    };

    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.isVisible = false;
        this.animationFrame = 0;
        this.rainbowSpeed = 0.01; // Controls how fast the colors change
        this.currentStats = null;
        this.animationId = null;
        this.applauseHasPlayed = false; // Track if applause has already played
    }


    calculateGrade(accuracy, isFullCombo) {
        if (accuracy >= 100 && isFullCombo) return 'SS';
        if (accuracy >= 95) return 'S';
        if (accuracy >= 85) return 'A';
        if (accuracy >= 70) return 'B';
        if (accuracy >= 60) return 'C';
        if (accuracy >= 50) return 'D';
        return 'F';
    }

    getRainbowColor() {
        const time = this.animationFrame * this.rainbowSpeed;
        const r = Math.sin(time) * 127 + 128;
        const g = Math.sin(time + 2 * Math.PI / 3) * 127 + 128;
        const b = Math.sin(time + 4 * Math.PI / 3) * 127 + 128;
        return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
    }

    animate() {
        if (!this.isVisible) {
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }
            return;
        }

        this.animationFrame++;
        this.drawEndScreen(this.currentStats);
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    playApplauseSound() {
        // Get volume from global state or use default
        let soundVolume = 0.3; // Default value

        if (window.volumeState && typeof window.volumeState.applauseSoundVolume === 'number') {
            soundVolume = window.volumeState.applauseSoundVolume;
        }

        // Check if volume is 0 or very low, don't play sound
        if (soundVolume <= 0.01) {
            console.log('Applause sound muted, volume:', soundVolume);
            return;
        }

        // Create and play the sound
        const sound = new Audio('./effects/Applause.mp3');
        sound.volume = soundVolume;

        console.log('Playing applause sound with volume:', soundVolume);

        sound.play().catch(error => {
            console.error('Error playing applause sound:', error);
        });
    }

    show(stats) {
        if (!stats) return; // Don't show if no stats provided

        this.isVisible = true;
        this.currentStats = stats;
        this.animationFrame = 0;
        this.applauseHasPlayed = false; // Reset applause played flag

        // Check grade and play applause if A or higher and NOT in auto-play mode
        const grade = this.calculateGrade(parseFloat(stats.accuracy), stats.isFullCombo);
        if (['A', 'S', 'SS'].includes(grade) && !stats.autoPlayUsed && !this.applauseHasPlayed) {
            this.playApplauseSound();
            this.applauseHasPlayed = true;
        }

        // Start animation only if we have stats
        if (!this.animationId && this.currentStats) {
            this.animate();
        }
    }

    drawEndScreen() {
        if (!this.isVisible || !this.currentStats) return;
        const stats = this.currentStats;

        // Clear canvas with solid black background
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw stats with centered alignment
        this.ctx.textAlign = 'center';

        // Calculate and draw grade
        const grade = this.calculateGrade(parseFloat(stats.accuracy), stats.isFullCombo);

        // Draw grade with large font and grade-specific color
        this.ctx.font = 'bold 120px nunito';
        this.ctx.fillStyle = EndScreenUI.GRADE_COLORS[grade];
        this.ctx.fillText(grade, this.canvas.width / 2, 160);

        // Draw "Results" text below grade
        this.ctx.font = 'bold 48px nunito';
        this.ctx.fillStyle = 'white';
        this.ctx.fillText('Results', this.canvas.width / 2, 220);

        // If auto-play was used, show indicator
        if (stats.autoPlayUsed) {
            this.ctx.font = 'bold 24px nunito';
            this.ctx.fillStyle = '#ff9b9b'; // Soft red/pink color
            this.ctx.fillText('Auto-Play Mode', this.canvas.width / 2, 260);
        }

        // Draw stats
        this.ctx.font = '32px nunito';
        const statsY = 300;
        const lineHeight = 50;

        // Stats display
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(`Score: ${stats.score}`, this.canvas.width / 2, statsY);
        this.ctx.fillText(`Max Combo: ${stats.maxCombo}x`, this.canvas.width / 2, statsY + lineHeight);
        this.ctx.fillText(`Accuracy: ${stats.accuracy}%`, this.canvas.width / 2, statsY + lineHeight * 2);

        // Note distribution with colors
        const distributionY = statsY + lineHeight * 3.5;

        this.ctx.font = '28px nunito';
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fillText(`Perfect: ${stats.perfectCount}`, this.canvas.width / 2, distributionY);

        this.ctx.fillStyle = '#ffff00';
        this.ctx.fillText(`Good: ${stats.goodCount}`, this.canvas.width / 2, distributionY + lineHeight);

        this.ctx.fillStyle = '#ff6666';
        this.ctx.fillText(`Bad: ${stats.badCount}`, this.canvas.width / 2, distributionY + lineHeight * 2);

        this.ctx.fillStyle = '#ff0000';
        this.ctx.fillText(`Miss: ${stats.missCount}`, this.canvas.width / 2, distributionY + lineHeight * 3);

        // Full Combo message if achieved - with rainbow effect
        if (stats.isFullCombo) {
            this.ctx.font = 'bold 36px nunito';
            this.ctx.fillStyle = this.getRainbowColor();
            this.ctx.fillText('★ FULL COMBO! ★', this.canvas.width / 2, distributionY + lineHeight * 4.5);
        }

        // Display auto-play score notice
        if (stats.autoPlayUsed) {
            this.ctx.font = '22px nunito';
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            this.ctx.fillText('Scores achieved in Auto-Play mode are not saved',
                this.canvas.width / 2,
                this.canvas.height - 100
            );
        }

        // Draw return instruction
        this.ctx.font = '24px nunito';
        this.ctx.fillStyle = 'white';
        this.ctx.fillText('Press ENTER to restart',
            this.canvas.width / 2,
            this.canvas.height - 60
        );
    }

    cleanup() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.isVisible = false;
        this.currentStats = null;
    }

    handleInput(event) {
        if (!this.isVisible) return false;
        this.cleanup();
        return event.key === 'Enter';
    }
}