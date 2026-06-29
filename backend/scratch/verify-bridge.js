const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { io: clientIo } = require('../../frontend/node_modules/socket.io-client');

// Mock Configuration
const PORT = 6001;
const BRIDGE_SECRET = 'test_secret_123';
const TEST_ROOM = 'user_test_user_id';
const TEST_EVENT = 'vitals:update';
const TEST_PAYLOAD = { heartRate: 85, spo2: 99, temperature: 36.8 };

const runTest = async () => {
  console.log('[Test] Starting Socket Bridge verification...');

  // 1. Initialize Mock Socket Server (like Render/Railway)
  const app = express();
  app.use(express.json());
  
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: '*' }
  });

  // Socket connection handler with mock auth
  io.use((socket, next) => {
    socket.user = { _id: 'test_user_id' };
    next();
  });

  io.on('connection', (socket) => {
    socket.join(TEST_ROOM);
    console.log(`[Server] Socket connected client to room ${TEST_ROOM}`);
  });

  // Socket Bridge endpoint
  app.post('/api/socket-bridge/emit', (req, res) => {
    const { secret, room, event, payload } = req.body;
    
    if (secret !== BRIDGE_SECRET) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    console.log(`[Bridge Server] Received emit request for room: ${room}, event: ${event}`);
    io.to(room).emit(event, payload);
    res.status(200).json({ success: true });
  });

  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`[Server] Listening on port ${PORT}`);

  // 2. Initialize Client connection
  const client = clientIo(`http://localhost:${PORT}`, {
    reconnectionDelay: 0,
    forceNew: true,
    transports: ['websocket'],
  });

  let testPassed = false;

  await new Promise((resolve, reject) => {
    // Timeout if event is not received within 3 seconds
    const timeout = setTimeout(() => {
      reject(new Error('Test timed out: Event was not received by client via Socket Bridge'));
    }, 3000);

    // Listen for the bridged event
    client.on(TEST_EVENT, (data) => {
      console.log('[Client] Received bridged event payload:', data);
      if (data.heartRate === TEST_PAYLOAD.heartRate && data.spo2 === TEST_PAYLOAD.spo2) {
        testPassed = true;
        clearTimeout(timeout);
        resolve();
      } else {
        clearTimeout(timeout);
        reject(new Error('Test failed: Payload mismatch'));
      }
    });

    client.on('connect', async () => {
      console.log('[Client] Connected. Triggering Socket Bridge POST from mock Serverless function...');
      
      try {
        const response = await fetch(`http://localhost:${PORT}/api/socket-bridge/emit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            secret: BRIDGE_SECRET,
            room: TEST_ROOM,
            event: TEST_EVENT,
            payload: TEST_PAYLOAD
          })
        });

        const result = await response.json();
        console.log('[Serverless Mock] Bridge response:', result);
      } catch (err) {
        console.error('[Serverless Mock] Fetch error:', err.message);
        clearTimeout(timeout);
        reject(err);
      }
    });
  });

  // 3. Clean up
  client.close();
  await new Promise((resolve) => server.close(resolve));

  if (testPassed) {
    console.log('\n[Test Result] ✅ SUCCESS: Socket Bridge functioned correctly!');
    process.exit(0);
  } else {
    console.error('\n[Test Result] ❌ FAILURE: Did not receive expected event.');
    process.exit(1);
  }
};

runTest().catch((err) => {
  console.error('\n[Test Error]', err.message);
  process.exit(1);
});
