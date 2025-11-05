
// TeleCMI mock server: accepts fixed-size PCM frames and logs timestamps
const WebSocket = require('ws');
const PORT = process.env.TELECMI_SIM_PORT || 9001;
const wss = new WebSocket.Server({ port: PORT });
console.log(`[TeleCMIMock] starting on ws://localhost:${PORT}`);

wss.on('connection', (ws) => {
    console.log('[TeleCMIMock] client connected');
    let count = 0;
    ws.on('message', (data) => {
        const now = new Date();
        count += 1;
        const buf = Buffer.from(data);
        console.log(`[TeleCMIMock] #${count} received ${buf.length} bytes at ${now.toISOString()}`);
    });

    ws.on('close', () => {
        console.log('[TeleCMIMock] client disconnected');
    });
});
