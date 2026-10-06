import { ImageSizeError } from '../error';

const CHUNK_SIZE = 64 * 1024;

/**
 * A stalled server would otherwise hang the caller forever — reading an image
 * header is quick, so anything this slow is better reported than waited on.
 */
const DEFAULT_TIMEOUT = 30_000;

/**
 * Redirects are followed one hop at a time so every target can be checked —
 * a public URL must not bounce to `169.254.169.254`.
 */
const MAX_REDIRECTS = 20;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/**
 * Loopback, private, link-local, multicast, and reserved targets — matched
 * against the canonical form the WHATWG URL parser produces, which already
 * collapses tricks like `http://0x7f.1` or `http://2130706433` into plain
 * `127.0.0.1`.
 */
function isReservedAddress(raw: string): boolean {
  const host = raw
    .replace(/^\[|\]$/g, '')
    .toLowerCase()
    .replace(/\.$/, '');

  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return isReservedV4(host);
  if (host.includes(':')) return isReservedV6(host);

  // a DNS name — judged by what it resolves to
  return false;
}

function isReservedV4(host: string): boolean {
  const [a, b, c] = host.split('.').map(Number);

  return (
    a === 0 || // 0.0.0.0/8
    a === 10 || // private
    (a === 100 && b >= 64 && b <= 127) || // CGNAT — Alibaba metadata sits here
    a === 127 || // loopback
    (a === 169 && b === 254) || // link-local — AWS/Azure/GCP metadata
    (a === 172 && b >= 16 && b <= 31) || // private
    (a === 192 && b === 0 && c === 0) || // 192.0.0.0/24 IETF protocol use
    (a === 192 && b === 168) || // private
    (a === 198 && (b === 18 || b === 19)) || // benchmarking
    a >= 224 // multicast, reserved, broadcast
  );
}

function isReservedV6(host: string): boolean {
  // IPv4-mapped literals serialize as hex (`::ffff:7f00:1`), and probing a
  // public address through one is not something a real image URL does
  if (host.startsWith('::ffff:')) return true;

  return (
    host === '::' || // unspecified
    host === '::1' || // loopback
    host.startsWith('fc') ||
    host.startsWith('fd') || // fc00::/7 unique local
    /^fe[89ab]/.test(host) || // fe80::/10 link-local
    host.startsWith('ff') // multicast
  );
}

export interface RequestOptions {
  /**
   * Abort each request after this many milliseconds.
   * Pass `0` (or `Infinity`) to wait forever.
   *
   * @defaultValue 30000
   */
  timeout?: number;

  /**
   * Extra headers to send.
   */
  headers?: Record<string, string>;

  /**
   * Allow remote URLs that target loopback, private, link-local, or
   * otherwise reserved addresses (`localhost`, `10.x`, `169.254.169.254`, ...).
   *
   * Off by default so a crafted image URL — in content, a config, or a
   * request — can't reach services on the machine or network running the
   * probe (cloud metadata endpoints, intranet panels, dev servers).
   *
   * @defaultValue false
   */
  allowPrivate?: boolean;
}

/**
 * Sequential streaming covers every format that keeps its header up front;
 * `readAt` exists for the one that doesn't (TIFF with a trailing IFD).
 */
export interface ByteSource {
  stream(limit: number): AsyncIterable<Uint8Array>;

  /** Read `[position, position + length)`, returning fewer bytes at EOF. */
  readAt(position: number, length: number): Promise<Uint8Array>;

  close(): Promise<void>;
}

type FileHandle = import('node:fs/promises').FileHandle;

/**
 * `node:fs` is imported lazily so that importing this package stays harmless
 * outside Node — `imageSize()` is pure and works anywhere.
 */
export function fileSource(src: string | URL): ByteSource {
  let handle: Promise<FileHandle> | undefined;
  const open = () => (handle ??= import('node:fs/promises').then((fs) => fs.open(src, 'r')));

  return {
    async *stream(limit) {
      const file = await open();
      const buffer = new Uint8Array(CHUNK_SIZE);
      let position = 0;

      while (position < limit) {
        const { bytesRead } = await file.read(
          buffer,
          0,
          Math.min(buffer.length, limit - position),
          position,
        );
        if (bytesRead === 0) return;

        position += bytesRead;
        // the consumer copies each chunk out before asking for the next one
        yield buffer.subarray(0, bytesRead);
      }
    },

    async readAt(position, length) {
      const file = await open();
      const buffer = new Uint8Array(length);
      let read = 0;

      while (read < length) {
        const { bytesRead } = await file.read(buffer, read, length - read, position + read);
        if (bytesRead === 0) break;
        read += bytesRead;
      }

      return buffer.subarray(0, read);
    },

    async close() {
      // a failed open() already surfaced through the read that triggered it
      await handle?.then((file) => file.close()).catch(() => {});
    },
  };
}

export function urlSource(url: string | URL, options: RequestOptions = {}): ByteSource {
  const { timeout = DEFAULT_TIMEOUT, headers, allowPrivate = false } = options;
  const base = typeof url === 'string' ? new URL(url) : url;
  const checkedHosts = new Set<string>();

  function blocked(host: string) {
    return new ImageSizeError(
      `refusing to fetch ${host}: loopback, private, and link-local addresses are blocked — pass \`allowPrivate: true\` to probe() if you trust it`,
      'EFORBIDDEN',
    );
  }

  async function assertAllowed(target: URL): Promise<void> {
    if (allowPrivate) return;

    const host = target.hostname;
    if (checkedHosts.has(host)) return;

    if (isReservedAddress(host)) throw blocked(host);

    // literals are decided above; a DNS name is judged by every address it
    // resolves to — Node only, a browser fetch does its own resolving
    const bare = host.replace(/^\[|\]$/g, '');
    const literal = bare.includes(':') || /^\d{1,3}(\.\d{1,3}){3}$/.test(bare);

    if (!literal) {
      let addresses: { address: string }[] | undefined;
      try {
        const dns = await import('node:dns/promises');
        addresses = await dns.lookup(bare, { all: true });
      } catch {
        // not Node, or unresolvable — fetch reports its own error
      }
      if (addresses?.some(({ address }) => isReservedAddress(address))) throw blocked(host);
    }

    checkedHosts.add(host);
  }

  async function request(extra?: Record<string, string>) {
    const controller = new AbortController();
    const timer =
      Number.isFinite(timeout) && timeout > 0
        ? setTimeout(
            () => controller.abort(new ImageSizeError(`timed out after ${timeout}ms`, 'ETIMEDOUT')),
            timeout,
          )
        : undefined;
    const done = () => clearTimeout(timer);
    const send = (target: string | URL, redirect: 'manual' | 'follow') =>
      fetch(target, {
        signal: controller.signal,
        redirect,
        headers: extra ? { ...headers, ...extra } : headers,
      });

    try {
      let target: URL = base;

      for (let hops = 0; ; hops++) {
        if (hops > MAX_REDIRECTS)
          throw new ImageSizeError(`more than ${MAX_REDIRECTS} redirects`, 'EHTTP');

        await assertAllowed(target);

        const res = await send(target, 'manual');

        // browsers answer manual redirects opaquely — the hop can't be
        // inspected, so follow it automatically (the URL the caller passed
        // was still validated)
        if (res.type === 'opaqueredirect') return { res: await send(target, 'follow'), done };

        const location = res.headers.get('location');
        if (location && REDIRECT_STATUSES.has(res.status)) {
          void res.body?.cancel().catch(() => {});
          target = new URL(location, target);
          continue;
        }

        return { res, done };
      }
    } catch (error) {
      clearTimeout(timer);
      throw error;
    }
  }

  function assertBody(res: Response): ReadableStream<Uint8Array> {
    if (!res.ok && res.status !== 206) {
      throw new ImageSizeError(`bad status code: ${res.status}`, 'EHTTP', res.status);
    }
    if (!res.body) throw new ImageSizeError('response has no body', 'ECONTENT');

    return res.body;
  }

  return {
    async *stream(limit: number) {
      const { res, done } = await request();

      try {
        // the consumer stops once it has the header, and `limit` caps what
        // the server can push before then — leaving the loop cancels the body
        let read = 0;
        for await (const chunk of assertBody(res)) {
          const take = Math.min(chunk.length, limit - read);
          if (take > 0) yield chunk.subarray(0, take);
          read += take;
          if (read >= limit) break;
        }
      } finally {
        done();
      }
    },

    async readAt(position, length) {
      const { res, done } = await request({
        range: `bytes=${position}-${position + length - 1}`,
      });

      try {
        // the range starts past the end of the resource
        if (res.status === 416) return new Uint8Array(0);

        // 206 delivers the requested window; 200 means the server ignored the
        // range header, so skip up to `position` and keep only what was asked
        let skip = res.status === 206 ? 0 : position;
        const out = new Uint8Array(length);
        let read = 0;

        for await (let chunk of assertBody(res)) {
          if (skip > 0) {
            if (chunk.length <= skip) {
              skip -= chunk.length;
              continue;
            }
            chunk = chunk.subarray(skip);
            skip = 0;
          }

          const take = Math.min(chunk.length, length - read);
          out.set(chunk.subarray(0, take), read);
          read += take;
          // leaving the loop cancels the stream
          if (read >= length) break;
        }

        return out.subarray(0, read);
      } finally {
        done();
      }
    },

    async close() {},
  };
}
