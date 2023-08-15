import { useEffect, useMemo, useRef, useState } from 'react';
import { store, type SessionData } from '@src/store';
import { currentlyLoggedStream, setLogState } from '@src/messages';

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
      setSessionData(value.sessions[tabId]);
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

  return (
    <div className="container">
      <Checkbox
        checked={logging}
        onChange={handleCheckboxChange}
        label="Enable logging"
      />
      <h2>Requests</h2>
      <ul>
        {sessionData?.requests.map((request, i) => (
          <li key={i}>
            {request.response.url} ({request.type})
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
