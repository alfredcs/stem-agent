import { CLI } from '@stem-agent/caller-layer';

const cli = new CLI({
  baseUrl: 'http://localhost:8080',  // or set STEM_AGENT_URL
  callerId: 'my-user',              // or set STEM_CALLER_ID
});
await cli.run();
