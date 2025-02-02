// Base class for all note types
export class Note {
    constructor(lane, startTime, speed = 2) {
        this.lane = lane;
        this.startTime = startTime;
        this.speed = speed;
        this.y = 0;
        this.isActive = true;
        this.wasHit = false;
    }

    update(currentTime) {
        if (!this.isActive) return;
        this.y += this.speed;
    }

    draw(ctx, laneX, noteRadius) {
        if (!this.isActive) return;
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(laneX, this.y, noteRadius, 0, Math.PI * 2);
        ctx.fill();
    }

    checkHit(hitY, perfectWindow, goodWindow) {
        if (!this.isActive) return null;
        const distance = Math.abs(this.y - hitY);

        if (distance <= perfectWindow) return 'PERFECT';
        if (distance <= goodWindow) return 'GOOD';
        if (distance <= goodWindow * 1.5) return 'BAD';
        return null;
    }
}

export class HoldNote extends Note {
    constructor(lane, startTime, duration, speed = 2) {
        super(lane, startTime, speed);
        this.duration = duration; // Duration in milliseconds
        this.endY = 0;
        this.isHolding = false;
        this.releaseTime = startTime + duration;
    }

    update(currentTime) {
        if (!this.isActive) return;
        super.update(currentTime);
        this.endY = this.y - (this.duration / 10); // Adjust this factor based on your speed and timing
    }

    draw(ctx, laneX, noteRadius) {
        if (!this.isActive) return;

        // Draw the hold line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = noteRadius * 2;
        ctx.beginPath();
        ctx.moveTo(laneX, this.y);
        ctx.lineTo(laneX, this.endY);
        ctx.stroke();

        // Draw end caps
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(laneX, this.y, noteRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(laneX, this.endY, noteRadius, 0, Math.PI * 2);
        ctx.fill();
    }

    startHold() {
        this.isHolding = true;
    }

    checkRelease(currentTime) {
        if (!this.isHolding) return 'MISS';
        const timingDiff = Math.abs(currentTime - this.releaseTime);

        if (timingDiff <= 100) return 'PERFECT';
        if (timingDiff <= 200) return 'GOOD';
        if (timingDiff <= 300) return 'BAD';
        return 'MISS';
    }
}