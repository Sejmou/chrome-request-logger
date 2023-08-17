import { store, type SessionData } from '@src/store';

console.log('background script loaded');

const activeSessions = new Set<number>();

// listen for tab creation, start logging requests for new tab
chrome.tabs.onCreated.addListener(tab => {
  if (tab.id) {
    console.log(`logging requests for tab ID ${tab.id}`);
    activeSessions.add(tab.id);
  }
});

// Listen for tab removal/close, cleanup/remove collected data
chrome.tabs.onRemoved.addListener(tabId => {
  console.log(`Tab with ID ${tabId} removed, stopping logging.`);
  activeSessions.delete(tabId);
  sessionsInMemory.delete(tabId);
});

// keep track of sessions in memory (and only periodically write to store to not trigger too many state updates at once in the UI)
const sessionsInMemory: Map<number, SessionData> = new Map();

// Listen for network responses
chrome.webRequest.onCompleted.addListener(
  (completedRequest: chrome.webRequest.WebResponseCacheDetails) => {
    console.log('new completed request', completedRequest);
    const { tabId } = completedRequest;
    if (tabId) {
      const existingSession = sessionsInMemory.get(tabId);
      const session: SessionData = existingSession || {
        startedAt: completedRequest.timeStamp,
        requests: [completedRequest],
      };
      if (existingSession) {
        existingSession.requests.push(completedRequest);
        return;
      }
      sessionsInMemory.set(tabId, session);
    } else {
      console.warn('Request is not associated with a particular tab.');
    }
  },
  { urls: ['<all_urls>'] }
);

// write session updates to store every second (to not trigger too many state updates at once in the UI)
setInterval(async () => {
  const storageSessions = (await store.get()).sessions || {}; // initially (on first extension run), store is undefined
  for (const [tabId, inMemorySession] of sessionsInMemory.entries()) {
    const storedSession = storageSessions[tabId];
    if (storedSession) {
      // check if timestamp of last stored request matches timestamp of last request
      // if it does, we must NOT append any requests to the stored request array as it is already up to date
      if (
        storedSession.requests.at(-1)?.timeStamp ===
        inMemorySession.requests.at(-1)?.timeStamp
      ) {
        continue;
      }
      storedSession.requests = storedSession.requests.concat(
        inMemorySession.requests
      );
    }
    storageSessions[tabId] = inMemorySession;
  }
  await store.set({ sessions: storageSessions });
}, 1000);
