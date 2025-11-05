
// Cartesia simulator: WebSocket server that sends variable-length PCM chunks to connected clients
const WebSocket = require('ws');
const PORT = process.env.CARTESIA_SIM_PORT || 9000;
const wss = new WebSocket.Server({ port: PORT });
const SAMPLE_RATE = parseInt(process.env.SAMPLE_RATE || '8000', 10);
const CHUNK_SIZE = Math.round(SAMPLE_RATE * 0.06 * 2); // 60ms chunk size for reference
console.log(`[CartesiaSim] starting on ws://localhost:${PORT} (reference chunk=${CHUNK_SIZE} bytes)`);

function generateSinePcm(durationMs, sampleRate) {
    const sampleCount = Math.round(sampleRate * durationMs / 1000);
    const buffer = Buffer.alloc(sampleCount * 2);
    const freq = 440;
    for (let i = 0; i < sampleCount; i++) {
        const t = i / sampleRate;
        const s = Math.round(Math.sin(2 * Math.PI * freq * t) * 30000); // small amplitude
        buffer.writeInt16LE(s, i * 2);
    }
    return buffer;
}

wss.on('connection', (ws) => {
    console.log('[CartesiaSim] client connected');
    let running = true;

    // Periodically send variable-length chunks (random multiples + remainder)
    (async () => {
        while (running) {
            // create a random-sized buffer between 50% and 300% of standard chunk
            const factor = 0.5 + Math.random() * 2.5;
            const bytes = Math.max(1, Math.round(CHUNK_SIZE * factor));
            // produce PCM for ~bytes length (approx)
            const approxMs = Math.max(10, Math.round(bytes / (sampleRateToBytesPerMs(SAMPLE_RATE))));
            const buf = generateSinePcm(approxMs, SAMPLE_RATE);
            // possibly slice to desired size
            const out = buf.slice(0, Math.min(bytes, buf.length));
            try {
                ws.send(out);
            } catch (err) {
                console.error('[CartesiaSim] send error', err);
                running = false;
                break;
            }
            // variable interval between sends
            await sleep(20 + Math.round(Math.random() * 40));
        }
    })();

    ws.on('close', () => {
        console.log('[CartesiaSim] client disconnected');
        running = false;
    });
});

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function sampleRateToBytesPerMs(sr) { return sr * 2 / 1000; }
