// Performance monitor: analyzes timing precision of the scheduler
const WebSocket = require('ws');

const TELECMI_WS = 'ws://localhost:9001';
const ws = new WebSocket(TELECMI_WS);

let lastTimestamp = null;
let intervals = [];
let count = 0;

ws.on('open', () => {
    console.log('[PerfMonitor] Connected to TeleCMI mock server');
    console.log('[PerfMonitor] Monitoring chunk timing precision...\n');
});

ws.on('message', (data) => {
    const now = performance.now();
    count++;
    
    if (lastTimestamp) {
        const interval = now - lastTimestamp;
        intervals.push(interval);
        
        // Show real-time stats every 10 chunks
        if (count % 10 === 0) {
            const recent = intervals.slice(-10);
            const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
            const jitter = Math.max(...recent) - Math.min(...recent);
            
            console.log(`Chunks: ${count}, Avg Interval: ${avg.toFixed(2)}ms, Jitter: ${jitter.toFixed(2)}ms, Size: ${data.length} bytes`);
        }
    }
    
    lastTimestamp = now;
});

ws.on('close', () => {
    if (intervals.length > 0) {
        const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const jitter = Math.max(...intervals) - Math.min(...intervals);
        console.log(`\n[PerfMonitor] Final Stats:`);
        console.log(`Total chunks: ${count}`);
        console.log(`Average interval: ${avg.toFixed(2)}ms (target: 60ms)`);
        console.log(`Max jitter: ${jitter.toFixed(2)}ms`);
        console.log(`Timing accuracy: ${((60 - Math.abs(60 - avg)) / 60 * 100).toFixed(1)}%`);
    }
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n[PerfMonitor] Shutting down...');
    ws.close();
    process.exit(0);
});