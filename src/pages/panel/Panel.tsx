import { useEffect, useMemo, useRef, useState } from 'react';
import { store, type SessionData, type RequestData } from '@src/store';

export default function Panel(): JSX.Element {
  const [sessionData, setSessionData] = useState<SessionData>();
  const tabIdRef = useRef<number>();

  useEffect(() => {
    const tabId = chrome.devtools.inspectedWindow.tabId;
    console.log('tab ID', tabId);
    tabIdRef.current = tabId;
    const sessionDataSub = store.valueStream.subscribe(value => {
      const sessionData = value.sessions[tabId];
      console.log('session data', sessionData);
      setSessionData(sessionData);
    });
    return () => {
      sessionDataSub.unsubscribe();
    };
  }, []);

  const filteredRequests: RequestData[] = useMemo(() => {
    if (!sessionData) {
      return [];
    }
    return sessionData.requests;
  }, [sessionData]);

  return (
    <div className="container p-1">
      <h2>Requests</h2>
      <ul className="p-1 list-disc list-inside">
        {filteredRequests.map((request, i) => (
          <li key={i}>
            {request.url} ({request.type}){' '}
            <Button
              onClick={() => {
                copyTextToClipboard(request.responseHeaders || {});
              }}
            >
              Copy request headers to clipboard
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const Button = ({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) => {
  return (
    <button
      onClick={onClick}
      className="bg-gray-800 hover:bg-gray-700 text-white py-2 px-4 rounded"
    >
      {children}
    </button>
  );
};

/**
 * copies text to the clipboard; workaround for navigator.clipboard.writeText which doesn't seem to work here
 *
 * @param text the string to copy to the clipboard
 */
function copyTextToClipboard(text: string | object) {
  if (typeof text === 'object') {
    text = JSON.stringify(text, null, 2);
  }
  console.log('copying text to clipboard', text);
  const tempInput = document.createElement('input');
  tempInput.value = text;
  document.body.appendChild(tempInput);
  tempInput.select();
  document.execCommand('copy');
  document.body.removeChild(tempInput);
}
