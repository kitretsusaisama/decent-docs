// wire contract: this path and the env var names below are read by the
// watcher client and by generated project code - keep them in sync.
export const DEV_SERVER_PATH = '/_decent_local_md';

export type DevWatchEvent = 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir';

export interface DevClientEvent extends WatchDirOptions {
  type: 'watch-dir';
}

export interface WatchDirOptions {
  dir: string;
  includes: string[];
}

export type DevServerEvent =
  | {
      type: 'change';
      event: DevWatchEvent;
      absolutePath: string;
      timestamp: number;
    }
  | {
      type: 'error';
      message: string;
      timestamp: number;
    };

export function encodeDevClientEvent(event: DevClientEvent): string {
  return JSON.stringify(event);
}

export function decodeDevClientEvent(value: string): DevClientEvent | undefined {
  try {
    return JSON.parse(value) as DevClientEvent;
  } catch {
    return undefined;
  }
}

export function encodeDevEvent(event: DevServerEvent): string {
  return JSON.stringify(event);
}

export function decodeDevEvent(value: string): DevServerEvent | undefined {
  try {
    return JSON.parse(value) as DevServerEvent;
  } catch {
    return undefined;
  }
}

const publicEnvNames = [
  'DECENT_LOCAL_MD_DEV_SERVER_URL',
  'NEXT_PUBLIC_DECENT_LOCAL_MD_DEV_SERVER_URL',
  'VITE_DECENT_LOCAL_MD_DEV_SERVER_URL',
];

export function getDevServerUrlFromEnv(): string | undefined {
  // must hardcode to allow bundlers to inline env variables
  if (typeof process === 'object' && 'env' in process) {
    return (
      process.env.DECENT_LOCAL_MD_DEV_SERVER_URL ??
      process.env.NEXT_PUBLIC_DECENT_LOCAL_MD_DEV_SERVER_URL ??
      process.env.VITE_DECENT_LOCAL_MD_DEV_SERVER_URL
    );
  }

  if (import.meta.env) {
    return (
      import.meta.env.DECENT_LOCAL_MD_DEV_SERVER_URL ??
      import.meta.env.NEXT_PUBLIC_DECENT_LOCAL_MD_DEV_SERVER_URL ??
      import.meta.env.VITE_DECENT_LOCAL_MD_DEV_SERVER_URL
    );
  }
}

export function setDevServerUrlInEnv(url: string) {
  for (const name of publicEnvNames) {
    process.env[name] = url;
  }
}
