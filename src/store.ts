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
