import { getMessage } from '@extend-chrome/messages';

export const [
  setLogState,
  logStateSetRequestStream,
  waitForLogStateSetRequest,
] = getMessage<{
  tabId: number;
  logging: boolean;
}>('logStateSetRequest');

export const [
  sendCurrentlyLogged,
  currentlyLoggedStream,
  waitForCurrentlyLogged,
] = getMessage<number[]>('currentlyLogged');
