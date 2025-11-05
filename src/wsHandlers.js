
// WebSocket handlers: manage connections to Cartesia (source) and TeleCMI (sink)
const WebSocket = require('ws');
const Repackager = require('./repackager');

function connectWithBackoff(url, protocols, options = {}) {
    const logger = options.logger || console;
    let ws = null;
    let shouldStop = false;
    let attempt = 0;

    function start() {
        attempt += 1;
        const backoff = Math.min(30000, 1000 * Math.pow(2, Math.min(attempt, 6)));
        logger.info(`[WS] connecting to ${url} (attempt ${attempt})`);
        ws = new WebSocket(url);

        ws.on('open', () => {
            logger.info(`[WS] connected to ${url}`);
            attempt = 0;
        });

        ws.on('message', (data) => {
            if (options.onMessage) options.onMessage(data);
        });

        ws.on('close', (code, reason) => {
            logger.warn(`[WS] closed ${url} code=${code} reason=${reason}`);
            if (!shouldStop) setTimeout(start, backoff);
        });

        ws.on('error', (err) => {
            logger.error(`[WS] error ${url}:`, err && err.stack ? err.stack : err);
            ws.close();
        });
    }

    start();

    return {
        getSocket: () => ws,
        stop: () => {
            shouldStop = true;
            if (ws) ws.close();
        },
        send: (data) => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(data);
                return true;
            } else {
                logger.warn(`[WS] cannot send, socket not open to ${url}`);
                return false;
            }
        }
    };
}

module.exports = { connectWithBackoff };
