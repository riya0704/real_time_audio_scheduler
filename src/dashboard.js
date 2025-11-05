// Real-time dashboard for video demo
const WebSocket = require('ws');

class DashboardMonitor {
    constructor() {
        this.metrics = {
            totalChunks: 0,
            avgInterval: 0,
            jitter: 0,
            lastTimestamp: null,
            intervals: []
        };
        this.startTime = Date.now();
    }

    connect() {
        this.ws = new WebSocket('ws://localhost:9001');
        
        this.ws.on('open', () => {
            console.clear();
            this.displayHeader();
            this.startDisplay();
        });

        this.ws.on('message', (data) => {
            this.processChunk(data);
        });
    }

    processChunk(data) {
        const now = performance.now();
        this.metrics.totalChunks++;
        
        if (this.metrics.lastTimestamp) {
            const interval = now - this.metrics.lastTimestamp;
            this.metrics.intervals.push(interval);
            
            // Keep only last 50 intervals for rolling average
            if (this.metrics.intervals.length > 50) {
                this.metrics.intervals.shift();
            }
            
            this.metrics.avgInterval = this.metrics.intervals.reduce((a, b) => a + b, 0) / this.metrics.intervals.length;
            this.metrics.jitter = Math.max(...this.metrics.intervals) - Math.min(...this.metrics.intervals);
        }
        
        this.metrics.lastTimestamp = now;
        this.metrics.chunkSize = data.length;
    }

    displayHeader() {
        console.log('╔══════════════════════════════════════════════════════════════╗');
        console.log('║              REAL-TIME AUDIO SCHEDULER DASHBOARD             ║');
        console.log('║                    Live Performance Metrics                  ║');
        console.log('╚══════════════════════════════════════════════════════════════╝');
        console.log();
    }

    startDisplay() {
        setInterval(() => {
            this.updateDisplay();
        }, 1000);
    }

    updateDisplay() {
        const runtime = Math.floor((Date.now() - this.startTime) / 1000);
        const throughput = this.metrics.totalChunks / runtime || 0;
        const accuracy = this.metrics.avgInterval ? ((60 - Math.abs(60 - this.metrics.avgInterval)) / 60 * 100) : 0;
        
        // Move cursor to top and clear
        process.stdout.write('\x1b[8;0H');
        
        console.log('┌─────────────────────────────────────────────────────────────┐');
        console.log(`│ Runtime: ${runtime}s                    Status: ${'🟢 ACTIVE'.padEnd(12)} │`);
        console.log('├─────────────────────────────────────────────────────────────┤');
        console.log(`│ Total Chunks: ${this.metrics.totalChunks.toString().padEnd(8)} Chunk Size: ${(this.metrics.chunkSize || 0).toString().padEnd(8)} │`);
        console.log(`│ Throughput: ${throughput.toFixed(1).padEnd(10)} chunks/sec                    │`);
        console.log('├─────────────────────────────────────────────────────────────┤');
        console.log(`│ Target Interval: 60.0ms        Actual: ${(this.metrics.avgInterval || 0).toFixed(1).padEnd(8)}ms │`);
        console.log(`│ Timing Accuracy: ${accuracy.toFixed(1).padEnd(8)}%                           │`);
        console.log(`│ Jitter Range: ${(this.metrics.jitter || 0).toFixed(1).padEnd(10)}ms                            │`);
        console.log('├─────────────────────────────────────────────────────────────┤');
        console.log(`│ Performance: ${this.getPerformanceBar(accuracy)}                    │`);
        console.log('└─────────────────────────────────────────────────────────────┘');
        console.log();
        console.log('📊 Real-time metrics updating every second...');
        console.log('🎯 Target: 960 bytes every 60ms with <5ms jitter');
        console.log();
    }

    getPerformanceBar(accuracy) {
        const bars = Math.floor(accuracy / 5);
        const filled = '█'.repeat(Math.min(bars, 20));
        const empty = '░'.repeat(20 - Math.min(bars, 20));
        return `${filled}${empty} ${accuracy.toFixed(1)}%`;
    }
}

const monitor = new DashboardMonitor();
monitor.connect();

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n🛑 Dashboard stopped');
    process.exit(0);
});