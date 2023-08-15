import { logStateSetRequestStream, sendCurrentlyLogged } from '@src/messages';
import { store, type SessionData, requestLogEntryValidator } from '@src/store';

console.log('background script loaded');

// Create a function to attach debugger
function attachDebuggerToTab(tabId: number) {
  chrome.debugger.attach({ tabId: tabId }, '1.2', function () {
    chrome.debugger.sendCommand(
      { tabId: tabId },
      'Network.enable',
      {},
      function () {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
        }
      }
    );
  });
}

function removeDebuggerFromTab(tabId: number) {
  chrome.debugger.detach({ tabId: tabId }, function () {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
    }
  });
}

const activeSessions = new Set<number>();

logStateSetRequestStream.subscribe(async ([request]) => {
  const { tabId, logging: shouldLog } = request;
  const tab = await chrome.tabs.get(tabId);
  if (tab?.url?.startsWith('http')) {
    if (tab.id) {
      if (shouldLog) {
        console.log(`enabling logging for tab ID ${tab.id}`);
        attachDebuggerToTab(tab.id);
        activeSessions.add(tab.id);
        sendCurrentlyLogged(Array.from(activeSessions));
      } else {
        console.log(`disabling logging for tab ID ${tab.id}`);
        removeDebuggerFromTab(tab.id);
        activeSessions.delete(tab.id);
        sendCurrentlyLogged(Array.from(activeSessions));
      }
    } else {
      console.warn('UNEXPECTED: no tab ID found in tab', tab);
    }
  }
});

// keep track of sessions in memory (and only periodically write to store to not trigger too many state updates at once in the UI)
const sessionsInMemory: Map<number, SessionData> = new Map();

// Listen for debugger events
chrome.debugger.onEvent.addListener((source, method, params) => {
  if (method === 'Network.responseReceived') {
    // console.log('source', source); // contains data about the tab
    // console.log('method', method); // method is always Network.responseReceived
    // console.log('params', params); // contains data about the response
    const { tabId } = source;
    if (tabId) {
      const existingSession = sessionsInMemory.get(tabId);
      const logEntry = requestLogEntryValidator.parse(params);
      const session: SessionData = existingSession || {
        startedAt: logEntry.timestamp,
        requests: [logEntry],
      };
      if (existingSession) {
        existingSession.requests.push(logEntry);
        return;
      }
      sessionsInMemory.set(tabId, session);
    } else {
      console.warn(
        'UNEXPECTED: no tab ID found in source for received response',
        source
      );
    }
  }
});

// write session updates to store every second (to not trigger too many state updates at once in the UI)
setInterval(async () => {
  const storageSessions = (await store.get()).sessions || {}; // initially (on first extension run), store is undefined
  for (const [tabId, inMemorySession] of sessionsInMemory.entries()) {
    const storedSession = storageSessions[tabId];
    if (storedSession) {
      // check if timestamp of last stored request matches timestamp of last request
      // if it does, we must NOT append any requests to the stored request array as it is already up to date
      if (
        storedSession.requests.at(-1)?.timestamp ===
        inMemorySession.requests.at(-1)?.timestamp
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
