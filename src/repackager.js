
// Repackager: accumulate variable-length PCM buffers and emit fixed-size chunks
const { EventEmitter } = require('events');

class Repackager extends EventEmitter {
    constructor(sampleRate = 8000, chunkDurationMs = 60, logger = console) {
        super();
        this.sampleRate = sampleRate;
        this.chunkDurationMs = chunkDurationMs;
        this.chunkSize = Math.round(sampleRate * (chunkDurationMs/1000) * 2); // bytes
        this.buffer = Buffer.alloc(0);
        this.logger = logger;
    }

    push(buffer) {
        if (!Buffer.isBuffer(buffer)) {
            this.logger.warn('Repackager: non-buffer pushed');
            return;
        }
        // Append incoming data
        this.buffer = Buffer.concat([this.buffer, buffer]);

        // Extract fixed-size chunks
        while (this.buffer.length >= this.chunkSize) {
            const chunk = this.buffer.slice(0, this.chunkSize);
            this.buffer = this.buffer.slice(this.chunkSize);
            this.emit('chunk', chunk);
        }

        // If buffer grows unbounded, emit overflow event
        const maxBufferBytes = this.chunkSize * 100; // arbitrary safety cap
        if (this.buffer.length > maxBufferBytes) {
            this.logger.error(`[Repackager] buffer overflow: ${this.buffer.length} bytes`);
            this.emit('overflow', this.buffer.length);
            // Drop oldest data to recover (policy choice)
            this.buffer = this.buffer.slice(this.buffer.length - maxBufferBytes);
        }
    }

    flush() {
        // On stream end, if there's leftover data, pad with zeros to produce one final chunk
        if (this.buffer.length > 0) {
            const padSize = this.chunkSize - (this.buffer.length % this.chunkSize);
            const padded = Buffer.concat([this.buffer, Buffer.alloc(padSize)]);
            for (let offset = 0; offset < padded.length; offset += this.chunkSize) {
                const chunk = padded.slice(offset, offset + this.chunkSize);
                this.emit('chunk', chunk);
            }
            this.buffer = Buffer.alloc(0);
        }
        this.emit('end');
    }
}

module.exports = Repackager;
