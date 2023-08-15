import { useEffect, useMemo, useRef, useState } from 'react';
import { store, type SessionData } from '@src/store';
import { currentlyLoggedStream, setLogState } from '@src/messages';

type RequestData = SessionData['requests'][number];

export default function Panel(): JSX.Element {
  const [sessionData, setSessionData] = useState<SessionData>();
  const [activeSessions, setActiveSessions] = useState<Set<number>>(new Set());
  const tabIdRef = useRef<number>();
  const logging = useMemo(
    () => !!tabIdRef.current && activeSessions.has(tabIdRef.current),
    [activeSessions]
  );
  console.log('rendering panel');

  useEffect(() => {
    const tabId = chrome.devtools.inspectedWindow.tabId;
    console.log('tab ID', tabId);
    tabIdRef.current = tabId;
    const sessionDataSub = store.valueStream.subscribe(value => {
      const sessionData = value.sessions[tabId];
      console.log('session data', sessionData);
      setSessionData(sessionData);
    });
    const sessionStateSub = currentlyLoggedStream.subscribe(([value]) => {
      console.log('currently logged', value);
      setActiveSessions(new Set(value));
    });
    return () => {
      sessionDataSub.unsubscribe();
      sessionStateSub.unsubscribe();
    };
  }, []);

  const handleCheckboxChange = async (newValue: boolean) => {
    const tabId = tabIdRef.current;
    if (!tabId) {
      console.warn('tab ID ref not set');
      return;
    }
    console.log('tabId ref value', tabId);
    console.log('new checkbox value', newValue);
    await setLogState({
      tabId,
      logging: newValue,
    });
    console.log('set log state request sent');
  };

  const filteredRequests: RequestData[] = useMemo(() => {
    if (!sessionData) {
      return [];
    }
    return sessionData.requests.filter(request => {
      if (request.type === 'XHR') {
        return true;
      }
      if (request.type === 'Fetch') {
        return true;
      }
    });
  }, [sessionData]);

  return (
    <div className="container p-1">
      <h2>Requests</h2>
      <Checkbox
        checked={logging}
        onChange={handleCheckboxChange}
        label="Enable logging"
      />
      <ul className="p-1 list-disc list-inside">
        {filteredRequests.map((request, i) => (
          <li key={i}>
            {request.response.url} ({request.type}){' '}
            <Button
              onClick={() => {
                copyTextToClipboard(request.response.headers);
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

const Checkbox = ({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) => {
  return (
    <label className="flex items-center space-x-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="h-5 w-5 text-gray-600"
      />
      <span className="text-gray-200">{label}</span>
    </label>
  );
};

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
