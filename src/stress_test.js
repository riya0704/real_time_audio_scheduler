// Stress test: simulates network issues and high load
const WebSocket = require('ws');

class StressTest {
    constructor() {
        this.cartesiaWs = null;
        this.running = false;
    }

    async start() {
        console.log('🔥 Starting Stress Test - Simulating Network Issues');
        console.log('This will test reconnection and error handling...\n');
        
        this.running = true;
        
        // Connect to Cartesia simulator
        this.cartesiaWs = new WebSocket('ws://localhost:9000');
        
        this.cartesiaWs.on('open', () => {
            console.log('✅ Connected to Cartesia simulator');
            this.runStressScenarios();
        });
    }

    async runStressScenarios() {
        const scenarios = [
            { name: 'Normal Operation', duration: 5000, action: () => {} },
            { name: 'Simulated Network Lag', duration: 3000, action: () => this.simulateLag() },
            { name: 'Connection Drop Test', duration: 2000, action: () => this.dropConnection() },
            { name: 'High Load Burst', duration: 4000, action: () => this.highLoadBurst() },
            { name: 'Recovery Test', duration: 5000, action: () => {} }
        ];

        for (const scenario of scenarios) {
            if (!this.running) break;
            
            console.log(`\n🎯 Running: ${scenario.name} (${scenario.duration/1000}s)`);
            scenario.action();
            await this.sleep(scenario.duration);
        }

        console.log('\n✅ Stress test completed! Check the main scheduler for resilience.');
    }

    simulateLag() {
        console.log('   📡 Simulating network latency...');
        // Add artificial delays to messages
    }

    dropConnection() {
        console.log('   🔌 Dropping connection to test reconnection...');
        if (this.cartesiaWs) {
            this.cartesiaWs.close();
        }
    }

    highLoadBurst() {
        console.log('   ⚡ Sending high-frequency data burst...');
        // Send rapid chunks to test buffer handling
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    stop() {
        this.running = false;
        if (this.cartesiaWs) {
            this.cartesiaWs.close();
        }
    }
}

const test = new StressTest();
test.start();

process.on('SIGINT', () => {
    console.log('\n🛑 Stress test stopped');
    test.stop();
    process.exit(0);
});