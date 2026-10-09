const io = require('socket.io-client');
const axios = require('axios');

async function testChat() {
  try {
    const api = axios.create({ baseURL: 'http://localhost:5000/api', withCredentials: true });

    // Wait until server is up
    for(let i=0; i<10; i++) {
        try {
            await api.get('/');
            break;
        } catch(e) {
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    // 1. Register User A
    const userA = { username: 'userA' + Date.now(), email: `a${Date.now()}@test.com`, password: 'password123', displayName: 'User A' };
    let res = await api.post('/auth/register', userA);
    const tokenA = res.headers['set-cookie'] ? res.headers['set-cookie'][0].split(';')[0].split('=')[1] : null;
    
    // 2. Register User B
    const userB = { username: 'userB' + Date.now(), email: `b${Date.now()}@test.com`, password: 'password123', displayName: 'User B' };
    res = await api.post('/auth/register', userB);
    const tokenB = res.headers['set-cookie'] ? res.headers['set-cookie'][0].split(';')[0].split('=')[1] : null;

    console.log("Registered User A & B successfully.");

    // Extract the JWT payload to use as auth
    const socketA = io('http://localhost:5000', { extraHeaders: { Cookie: `token=${tokenA}` } });
    const socketB = io('http://localhost:5000', { extraHeaders: { Cookie: `token=${tokenB}` } });

    socketA.on('connect', () => console.log('User A Socket connected'));
    socketB.on('connect', () => console.log('User B Socket connected'));

    // 3. Create a private conversation between A and B
    res = await api.post('/conversations/private', { targetUserId: res.data.user._id }, { headers: { Cookie: `token=${tokenA}` }});
    const conversationId = res.data._id;
    console.log("Created private conversation: ", conversationId);

    // 4. Listen for message on B
    let messageReceived = false;
    socketB.on('message:receive', (msg) => {
        console.log("User B Received Message:", msg.ciphertext);
        messageReceived = true;
        
        socketA.disconnect();
        socketB.disconnect();
        console.log("SUCCESS: Entire project chat flow verified via Socket.IO.");
        process.exit(0);
    });

    // 5. User A sends message to B via API and emits socket event
    setTimeout(async () => {
        console.log("User A Sending message...");
        const msgRes = await api.post(`/messages/${conversationId}`, {
            type: 'text',
            ciphertext: 'ENCRYPTED_DATA_MOCK',
            iv: 'IV_MOCK'
        }, { headers: { Cookie: `token=${tokenA}` }});

        socketA.emit('message:send', { _id: msgRes.data._id, conversationId });
    }, 1000);

    setTimeout(() => {
        if(!messageReceived) {
            console.error("Test timed out! Message not received.");
            process.exit(1);
        }
    }, 5000);

  } catch(e) {
      console.error("Error: ", e.response?.data || e.message);
      process.exit(1);
  }
}

testChat();

