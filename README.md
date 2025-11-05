
# Real-Time Audio Scheduler (Demo)

**What this is**
- A Node.js reference implementation of a Real-Time Audio Scheduler that bridges a Cartesia-like TTS WebSocket (variable-length PCM chunks) with a TeleCMI-like WebSocket (expects fixed 60ms PCM chunks delivered at precise 60ms intervals).

**Contents**
- `src/` - source code
- `src/simulators/` - demo simulators for Cartesia (variable chunks) and TeleCMI (mock server)
- `.env.example` - configuration example
- `README.md` - this file

**Quick demo (recommended)**
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start TeleCMI mock server (in one terminal):
   ```bash
   npm run start:telecmi
   ```
3. Start Cartesia simulator (in another terminal):
   ```bash
   npm run start:cartesia
   ```
4. Start the scheduler bridge (in a third terminal):
   ```bash
   npm start -- --demo
   ```
5. Optional - Monitor performance (in a fourth terminal):
   ```bash
   npm run monitor
   ```

The bridge will connect to the Cartesia simulator (ws://localhost:9000) and TeleCMI mock (ws://localhost:9001), repackage audio into fixed 60ms chunks (960 bytes at 8kHz), and transmit them at precise 60ms intervals. Console logs show timestamps and metrics.

**What you'll see:**
- Cartesia simulator generating variable-length PCM chunks
- TeleCMI mock server receiving consistent 960-byte chunks every ~60ms
- Real-time performance metrics and connection status

**Project structure highlights**
- `src/repackager.js` - buffers incoming variable data and emits fixed-size chunks
- `src/scheduler.js` - high-precision scheduler that sends one chunk every 60ms with drift correction
- `src/wsHandlers.js` - WebSocket handling & reconnection
- `src/index.js` - entrypoint that wires everything and runs demo

**Notes & assumptions**
- This is a reference/demo implementation. For production, secure credentials, TLS, monitoring, and robust process supervision should be added.
- The demo uses simple PCM sine-wave data to simulate audio chunks.

# real_time_audio_scheduler
