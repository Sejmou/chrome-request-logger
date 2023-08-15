import {
  store,
  logEnableOrDisable,
  type SessionData,
  type LogStateUpdate,
  requestLogEntryValidator,
} from '@src/store';

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

let lastLogStateUpdateRequest: LogStateUpdate | undefined;
const activeSessions = new Set<number>();

logEnableOrDisable.valueStream.subscribe(async request => {
  // on first run of the extension, update will actually be {}
  // handle this accordingly
  if (Object.keys(request).length === 0) {
    return;
  }
  const [tabId, loggingEnabled] = request.data;
  if (lastLogStateUpdateRequest) {
    const [lastTabId, lastLoggingEnabled] = lastLogStateUpdateRequest;
    if (lastTabId === tabId && lastLoggingEnabled === loggingEnabled) {
      console.log('logging state did not change, skipping');
      return;
    }
  }
  lastLogStateUpdateRequest = request.data;
  console.log('tab ID logging state changed', request);
  try {
    const tab = await chrome.tabs.get(tabId);
    console.log('setting logging state for tab', tabId, 'to', loggingEnabled);
    if (tab?.url?.startsWith('http')) {
      if (tab.id) {
        if (loggingEnabled) {
          attachDebuggerToTab(tab.id);
          activeSessions.add(tab.id);
        } else {
          removeDebuggerFromTab(tab.id);
          activeSessions.delete(tab.id);
        }
      }
    }
  } catch (error) {
    console.warn('could not find tab', tabId, '- probably closed');
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
  console.log('stored sessions', storageSessions);
  console.log('in memory sessions', sessionsInMemory);
  for (const [tabId, inMemorySession] of sessionsInMemory.entries()) {
    const storedSession = storageSessions[tabId];
    console.log('stored session', storedSession);
    if (storedSession) {
      // check if timestamp of last stored request matches timestamp of last request
      // if it does, we must NOT append any requests to the stored request array as it is already up to date
      if (
        storedSession.requests.at(-1)?.timestamp ===
        inMemorySession.requests.at(-1)?.timestamp
      ) {
        console.log(
          `stored session requests for tab ID '${tabId}' up to date, not appending anything`
        );
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
