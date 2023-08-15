import { getBucket } from '@extend-chrome/storage';
import { z } from 'zod';

export const requestLogEntryValidator = z.object({
  timestamp: z.number(),
  type: z.string(),
  response: z.object({
    headers: z.record(z.string()),
    mimeType: z.string(),
    protocol: z.string(),
    remoteIPAddress: z.string().optional(),
    remotePort: z.number().optional(),
    securityState: z.string(),
    status: z.number(),
    statusText: z.string(),
    url: z.string(),
  }),
});

type RequestLogEntry = z.infer<typeof requestLogEntryValidator>;

export type SessionStore = {
  sessions: {
    [tabId: number]: SessionData;
  };
};

export type SessionData = {
  startedAt: number;
  requests: RequestLogEntry[];
};

const storeKey = 'loggerData';
export const store = getBucket<SessionStore>(storeKey);

export type LogStateUpdate = [trackId: number, loggingEnabled: boolean];

type LogEnableOrDisable = {
  data: LogStateUpdate;
}; // only array as value does not work as expected -> Object with keys 0 and 1 is returned instead of array (for nerds reading this: I know, technically arrays are also objects but I guess the Prototype inheritance BS is not done correctly)

// abusing bucket for passing messages between background script and panel script (probably not the cleanest solution but it works)
export const logEnableOrDisable =
  getBucket<LogEnableOrDisable>('logEnableOrDisable');
