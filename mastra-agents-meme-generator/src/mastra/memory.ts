import { LibSQLStore } from '@mastra/libsql';
import { Memory } from '@mastra/memory';

// Configure LibSQL storage for local development
const storage = new LibSQLStore({
  url: 'file:./mastra-chat-history.db',
});

// Configure Memory with the storage
export const memory = new Memory({
  storage,
});

export { storage };
