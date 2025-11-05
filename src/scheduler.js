
// Scheduler: sends fixed-size chunks at precise intervals with drift correction
const { performance } = require('perf_hooks');

class Scheduler {
    constructor(sendFunc, options = {}) {
        this.sendFunc = sendFunc; // async function to send a Buffer
        this.intervalMs = options.intervalMs || 60;
        this.queue = [];
        this.running = false;
        this.logger = options.logger || console;
        this.silenceFrame = options.silenceFrame || null;
    }

    enqueue(chunk) {
        this.queue.push(chunk);
        // Protect against excessive queue growth
        const maxQueue = 500;
        if (this.queue.length > maxQueue) {
            this.logger.warn(`[Scheduler] queue overflow: ${this.queue.length} items`);
            // drop oldest
            this.queue = this.queue.slice(this.queue.length - maxQueue);
        }
    }

    start() {
        if (this.running) return;
        this.running = true;
        this._loop();
    }

    stop() {
        this.running = false;
    }

    async _loop() {
        let nextSendTime = performance.now();
        while (this.running) {
            const now = performance.now();
            if (now < nextSendTime) {
                // sleep until nextSendTime
                const delay = nextSendTime - now;
                await new Promise(r => setTimeout(r, Math.max(0, Math.round(delay))));
            }

            // Send a chunk (or silence if underflow)
            const chunk = this.queue.length > 0 ? this.queue.shift() : this.silenceFrame;
            if (!chunk) {
                this.logger.warn('[Scheduler] underflow - no chunk available, sending silence');
            }
            try {
                await this.sendFunc(chunk);
            } catch (err) {
                this.logger.error('[Scheduler] send error', err && err.stack ? err.stack : err);
            }

            nextSendTime += this.intervalMs;

            // If we're falling behind massively, fast-forward to now to recover
            const drift = performance.now() - nextSendTime;
            if (drift > 500) {
                this.logger.warn(`[Scheduler] large drift detected (${drift.toFixed(1)}ms), recovering`);
                nextSendTime = performance.now();
            }
        }
    }
}

module.exports = Scheduler;
