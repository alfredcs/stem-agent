import WebSocket from 'ws';
const ws = new WebSocket('ws://localhost:8080/ws');
ws.onopen = () => {
  console.log('✅ Connected to WebSocket server');
  // Send a task — type must match WsEventType.CLIENT_MESSAGE = "client.message"
  ws.send(JSON.stringify({
    type: 'client.message',
    message: 'Summarize recent AI research trends',
    callerId: 'user-123'
  }));
  console.log('📤 Message sent');
};
ws.onmessage = (event) => {
  const data = JSON.parse(event.data as string);
  console.log(`[${data.type}]`, JSON.stringify(data.data ?? {}).slice(0, 200));
  if (data.type === 'task.completed' || data.type === 'task.failed') {
    ws.close();
  }
};
ws.onerror = (error) => {
  console.error('❌ WebSocket Error:', error.message);
};
ws.onclose = () => {
  console.log('🔌 Connection closed');
};
