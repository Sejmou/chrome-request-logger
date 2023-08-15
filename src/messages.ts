import { getMessage } from '@extend-chrome/messages';

type LogState = {
  trackId: string;
  logging: boolean;
};

export const [sendLogState, logStateStream, waitForLogState] =
  getMessage<LogState>('logState');

export const [
  setLogState,
  logStateSetRequestStream,
  waitForLogStateSetRequest,
] = getMessage<LogState>('logStateSetRequest');

export const [
  getLogState,
  logStateGetRequestStream,
  waitForLogStateGetRequest,
] = getMessage<{
  trackId: string;
}>('logStateGetRequest');
