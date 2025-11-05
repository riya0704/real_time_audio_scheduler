
// Entry point: wires Cartesia -> Repackager -> Scheduler -> TeleCMI
const { connectWithBackoff } = require('./wsHandlers');
const Repackager = require('./repackager');
const Scheduler = require('./scheduler');
const WebSocket = require('ws');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const { argv } = require('process');
const winston = require('winston');

dotenv.config();

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level}] ${message}`)
    ),
    transports: [
        new winston.transports.Console()
    ]
});

const SAMPLE_RATE = parseInt(process.env.SAMPLE_RATE || '8000', 10);
const CHUNK_DURATION_MS = parseInt(process.env.CHUNK_DURATION_MS || '60', 10);
const CARTESIA_WS = process.env.CARTESIA_WS_URL || 'ws://localhost:9000';
const TELECMI_WS = process.env.TELECMI_WS_URL || 'ws://localhost:9001';

const repackager = new Repackager(SAMPLE_RATE, CHUNK_DURATION_MS, logger);
const silenceFrame = Buffer.alloc(repackager.chunkSize); // silence = zeros

// TeleCMI client (sink)
const telecmiClientHandle = connectWithBackoff(TELECMI_WS, null, {
    logger,
    onMessage: () => {}
});

// Scheduler - sends to TeleCMI via telecmiClientHandle.send
const scheduler = new Scheduler(async (chunk) => {
    if (!chunk) {
        // send silence
        telecmiClientHandle.send(silenceFrame);
        return;
    }
    const ok = telecmiClientHandle.send(chunk);
    if (!ok) {
        logger.warn('[Main] TeleCMI socket not open when trying to send chunk');
    }
}, { intervalMs: CHUNK_DURATION_MS, logger, silenceFrame });

// When repackager emits chunk, enqueue into scheduler
repackager.on('chunk', (chunk) => {
    scheduler.enqueue(chunk);
});
repackager.on('overflow', (size) => {
    logger.error('[Main] repackager overflow size=' + size);
});

// Cartesia client (source)
const cartesiaHandle = connectWithBackoff(CARTESIA_WS, null, {
    logger,
    onMessage: (data) => {
        // assume Buffer or ArrayBuffer
        const buf = Buffer.from(data);
        repackager.push(buf);
    }
});

// CLI demo flag: if --demo passed, start local simulators automatically
const demoMode = argv.includes('--demo');

async function start() {
    if (demoMode) {
        // attempt to start simple local simulators by spawning node scripts (best-effort)
        const child_process = require('child_process');
        try {
            const cartesiaSim = child_process.spawn('node', ['src/simulators/cartesia_simulator.js'], { stdio: 'inherit' });
            const teleSim = child_process.spawn('node', ['src/simulators/telecmi_mock_server.js'], { stdio: 'inherit' });
            logger.info('[Main] started local demo simulators (child processes)');
        } catch (err) {
            logger.warn('[Main] could not start simulators automatically; run them manually if desired');
        }
    }

    // start scheduler
    scheduler.start();

    // Graceful shutdown handlers
    process.on('SIGINT', () => {
        logger.info('SIGINT received - shutting down');
        cartesiaHandle.stop();
        telecmiClientHandle.stop();
        scheduler.stop();
        repackager.flush();
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        logger.info('SIGTERM received - shutting down');
        cartesiaHandle.stop();
        telecmiClientHandle.stop();
        scheduler.stop();
        repackager.flush();
        process.exit(0);
    });
}

start();
