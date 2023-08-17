import { getBucket } from '@extend-chrome/storage';

export type SessionStore = {
  sessions: {
    [tabId: number]: SessionData;
  };
};

export type SessionData = {
  startedAt: number;
  requests: chrome.webRequest.WebResponseCacheDetails[];
};

const storeKey = 'loggerData';
export const store = getBucket<SessionStore>(storeKey);

export type RequestData = SessionData['requests'][number];
type RequestType = RequestData['type'];

export const requestTypes: ReadonlyArray<RequestType> = [
  'main_frame',
  'sub_frame',
  'stylesheet',
  'script',
  'image',
  'font',
  'object',
  'xmlhttprequest',
  'ping',
  'csp_report',
  'media',
  'websocket',
  'other',
];
