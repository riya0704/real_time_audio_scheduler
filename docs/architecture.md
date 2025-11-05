
# Architecture: Real-Time Audio Scheduler (Reference)

Flow:
Cartesia (WebSocket, variable PCM chunks)
        |
        v
wsHandlers.receive -> repackager.buffer -> emits fixed 60ms chunks
        |
        v
scheduler.queue -> high-precision send loop (every 60ms)
        |
        v
wsHandlers.send -> TeleCMI (WebSocket expects 60ms PCM frames)

Components:
- Repackager: Receives streaming variable-length PCM buffers, accumulates them, and slices fixed-size frames (bytes = sampleRate * 0.06 * 2). Emits 'chunk' events.
- Scheduler: Maintains a FIFO queue of fixed-size chunks and uses a drift-corrected timing loop to transmit one chunk every 60ms. Handles underflow/overflow by logging and optionally sending silence frames.
- WS Handlers: Connects to Cartesia (source) and TeleCMI (sink), supports reconnection with exponential backoff, and forwards incoming buffers to the Repackager.
- Simulators (demo): Simple Cartesia simulator (variable-sized buffers) and TeleCMI mock server (logs per-chunk arrival times).

Timing:
- Interval: 60ms fixed
- Approach: schedule next send using high-resolution monotonic clock (performance.now) and setTimeout with corrected delay to account for drift and system load.
