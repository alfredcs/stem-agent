import { A2AClient } from '@stem-agent/caller-layer';

const client = new A2AClient({ endpoint: 'http://localhost:8080' });

// Discover capabilities
const card = await client.discoverAgent();
console.log('Agent:', card.name, '| Skills:', card.skills?.length ?? 0);

// Send a task
const result = await client.sendTask({ content: 'What is 2+2?' });
console.log('Result:', result.status, '—', String(result.content).slice(0, 200));

// Stream a task
for await (const update of client.subscribeToTask({ content: 'Explain REST APIs briefly' })) {
  console.log('Update:', update.status, '—', String(update.content).slice(0, 100));
}
