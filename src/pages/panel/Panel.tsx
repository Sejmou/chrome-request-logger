import { useEffect, useRef, useState } from 'react';
import '@pages/panel/Panel.css';
import { logEnableOrDisable, store, type SessionData } from '@src/store';

export default function Panel(): JSX.Element {
  const [sessionData, setSessionData] = useState<SessionData>();
  const [loggingEnabled, setLoggingEnabled] = useState(false);
  const tabIdRef = useRef<number>();
  console.log('rendering panel');

  useEffect(() => {
    const tabId = chrome.devtools.inspectedWindow.tabId;
    console.log('tab ID', tabId);
    tabIdRef.current = tabId;
    const sub = store.valueStream.subscribe(value => {
      const sessionData = value.sessions[tabId];
      console.log('session data', sessionData);
      setSessionData(value.sessions[tabId]);
    });
    return () => {
      sub.unsubscribe();
    };
  }, []);

  const handleCheckboxChange = (newValue: boolean) => {
    const tabId = tabIdRef.current;
    if (!tabId) {
      console.warn('tab ID ref not set');
      return;
    }
    console.log('tabId ref value', tabId);
    console.log('new checkbox value', newValue);
    setLoggingEnabled(newValue); // optimistic update
    logEnableOrDisable.set({ data: [tabId, newValue] }); // request background script to update loggingEnabled for session in store
  };

  return (
    <div className="container">
      <Checkbox
        checked={loggingEnabled}
        onChange={handleCheckboxChange}
        label="Enable logging"
      />
    </div>
  );
}

const Checkbox = ({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (loggingEnabled: boolean) => void;
  label: string;
}) => {
  return (
    <label className="flex items-center space-x-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="form-checkbox h-5 w-5 text-gray-600"
      />
      <span className="text-gray-200">{label}</span>
    </label>
  );
};
