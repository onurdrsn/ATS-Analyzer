import dns from 'node:dns';
import { isIP } from 'node:net';

export const ALLOWED_SCHEMES = new Set(['http:', 'https:']);
export const ALLOWED_PORTS = new Set([80, 443, 8080, 8443]);
export const MAX_REDIRECTS = 5;

export class ValidationError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = statusCode;
  }
}

export class SsrfError extends Error {
  statusCode: number;
  constructor(message: string) {
    super(message);
    this.name = 'SsrfError';
    this.statusCode = 403;
  }
}

/**
 * Parses an IPv4 dotted-decimal string into an array of 4 octets.
 * Returns null if invalid.
 */
export function parseIPv4(ip: string): [number, number, number, number] | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  const octets: number[] = [];
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null;
    const n = Number(part);
    if (n < 0 || n > 255) return null;
    octets.push(n);
  }
  return octets as [number, number, number, number];
}

/**
 * Parses an IPv6 string into 8 16-bit numbers.
 * Handles :: shorthand and embedded IPv4 dotted quads (e.g. ::ffff:127.0.0.1).
 * Returns null if invalid.
 */
export function parseIPv6(ip: string): number[] | null {
  let clean = ip.toLowerCase();

  // Handle embedded IPv4 at the end: e.g. ::ffff:192.168.1.1
  const lastColon = clean.lastIndexOf(':');
  if (lastColon !== -1) {
    const potentialIpv4 = clean.slice(lastColon + 1);
    const ipv4Parts = parseIPv4(potentialIpv4);
    if (ipv4Parts) {
      const g6 = ((ipv4Parts[0] << 8) | ipv4Parts[1]).toString(16);
      const g7 = ((ipv4Parts[2] << 8) | ipv4Parts[3]).toString(16);
      clean = clean.slice(0, lastColon) + ':' + g6 + ':' + g7;
    }
  }

  const doubleColonCount = (clean.match(/::/g) || []).length;
  if (doubleColonCount > 1) return null;

  let groups: string[];
  if (doubleColonCount === 1) {
    const [leftStr, rightStr] = clean.split('::');
    const left = leftStr ? leftStr.split(':') : [];
    const right = rightStr ? rightStr.split(':') : [];
    const missing = 8 - (left.length + right.length);
    if (missing < 1) return null;
    groups = [...left, ...Array(missing).fill('0'), ...right];
  } else {
    groups = clean.split(':');
  }

  if (groups.length !== 8) return null;
  const nums: number[] = [];
  for (const g of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(g)) return null;
    nums.push(parseInt(g, 16));
  }
  return nums;
}

/**
 * Comprehensive check whether an IP address belongs to a private, loopback,
 * link-local, multicast, reserved, or internal range.
 * ZERO EXEMPTION policy: no whitelist or bypass flags.
 */
export function isPrivateIP(rawIp: string): boolean {
  if (!rawIp || typeof rawIp !== 'string') return false;
  const ip = rawIp.trim().replace(/^\[|\]$/g, '').toLowerCase();

  // Try IPv4
  const v4 = parseIPv4(ip);
  if (v4) {
    const [o0, o1, o2, o3] = v4;

    // 0.0.0.0/8 (Current network / Linux loopback alias)
    if (o0 === 0) return true;

    // 10.0.0.0/8 (RFC 1918 Private)
    if (o0 === 10) return true;

    // 100.64.0.0/10 (RFC 6598 Carrier Grade NAT / Shared Address Space)
    if (o0 === 100 && o1 >= 64 && o1 <= 127) return true;

    // 127.0.0.0/8 (RFC 1122 Loopback)
    if (o0 === 127) return true;

    // 169.254.0.0/16 (RFC 3927 Link-local / Cloud metadata service)
    if (o0 === 169 && o1 === 254) return true;

    // 172.16.0.0/12 (RFC 1918 Private)
    if (o0 === 172 && o1 >= 16 && o1 <= 31) return true;

    // 192.0.0.0/24 (RFC 6890 IETF Protocol Assignments)
    if (o0 === 192 && o1 === 0 && o2 === 0) return true;

    // 192.0.2.0/24 (RFC 5737 TEST-NET-1)
    if (o0 === 192 && o1 === 0 && o2 === 2) return true;

    // 192.88.99.0/24 (RFC 7526 6to4 Relay Anycast)
    if (o0 === 192 && o1 === 88 && o2 === 99) return true;

    // 192.168.0.0/16 (RFC 1918 Private)
    if (o0 === 192 && o1 === 168) return true;

    // 198.18.0.0/15 (RFC 2544 Benchmarking)
    if (o0 === 198 && (o1 === 18 || o1 === 19)) return true;

    // 198.51.100.0/24 (RFC 5737 TEST-NET-2)
    if (o0 === 198 && o1 === 51 && o2 === 100) return true;

    // 203.0.113.0/24 (RFC 5737 TEST-NET-3)
    if (o0 === 203 && o1 === 0 && o2 === 113) return true;

    // 224.0.0.0/4 (RFC 5771 Multicast) & 240.0.0.0/4 (RFC 1112 Reserved) & 255.255.255.255 (Broadcast)
    if (o0 >= 224) return true;

    return false;
  }

  // Try IPv6
  const v6 = parseIPv6(ip);
  if (v6) {
    // :: (unspecified)
    if (v6.every((g) => g === 0)) return true;

    // ::1 (loopback)
    if (v6.slice(0, 7).every((g) => g === 0) && v6[7] === 1) return true;

    // fe80::/10 (link-local) -> 1111 1110 10xx xxxx (0xfe80 - 0xfebf)
    if ((v6[0] & 0xffc0) === 0xfe80) return true;

    // fc00::/7 (unique local) -> 1111 110x xxxx xxxx (fc00::/8 and fd00::/8)
    if ((v6[0] & 0xfe00) === 0xfc00) return true;

    // ff00::/8 (multicast) -> 1111 1111 xxxx xxxx
    if ((v6[0] & 0xff00) === 0xff00) return true;

    // ::ffff:0:0/96 (IPv4-mapped IPv6, e.g. ::ffff:127.0.0.1)
    if (v6.slice(0, 5).every((g) => g === 0) && v6[5] === 0xffff) {
      return true;
    }

    // ::ffff:0:0:0/96 (IPv4-translated)
    if (v6.slice(0, 4).every((g) => g === 0) && v6[4] === 0xffff && v6[5] === 0) {
      return true;
    }

    // 64:ff9b::/96 (IPv4/IPv6 translation)
    if (v6[0] === 0x0064 && v6[1] === 0xff9b && v6.slice(2, 6).every((g) => g === 0)) {
      return true;
    }

    // 2001:db8::/32 (documentation)
    if (v6[0] === 0x2001 && v6[1] === 0x0db8) return true;

    // 100::/64 (discard-only)
    if (v6[0] === 0x0100 && v6.slice(1, 4).every((g) => g === 0)) return true;

    return false;
  }

  // Not an IP address
  return false;
}

/**
 * Validates a target URL against SSRF vulnerabilities:
 * 1. Checks scheme (http: and https: only) -> 400 Bad Request
 * 2. Checks port (80, 443, 8080, 8443 only) -> 400 Bad Request
 * 3. Strips brackets from IPv6 hostnames before DNS lookup
 * 4. Resolves ALL IP addresses via dns.promises.lookup(hostname, { all: true })
 * 5. Rejects immediately if ANY resolved IP is private/reserved -> 403 Forbidden
 * 6. ZERO EXEMPTION: no whitelist or bypass flags
 */
export async function validateUrlSecurity(urlStr: string): Promise<URL> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlStr);
  } catch {
    throw new ValidationError('Invalid URL format', 400);
  }

  // Scheme validation: strictly http or https
  if (!ALLOWED_SCHEMES.has(parsedUrl.protocol)) {
    throw new ValidationError(`Invalid URL scheme "${parsedUrl.protocol}". Only http/https allowed.`, 400);
  }

  // Port validation: standard web ports only
  const effectivePort = parsedUrl.port
    ? parseInt(parsedUrl.port, 10)
    : (parsedUrl.protocol === 'https:' ? 443 : 80);

  if (isNaN(effectivePort) || !ALLOWED_PORTS.has(effectivePort)) {
    throw new ValidationError(
      `Invalid port ${parsedUrl.port || effectivePort}. Only standard web ports (80, 443, 8080, 8443) are allowed.`,
      400
    );
  }

  // Strip brackets from IPv6 hostnames before DNS lookup
  const cleanHostname = parsedUrl.hostname.replace(/^\[|\]$/g, '').trim();
  if (!cleanHostname) {
    throw new ValidationError('Hostname cannot be empty', 400);
  }

  // Direct IP literal check: if the hostname itself is an IP and private/reserved, reject immediately
  if (isIP(cleanHostname) !== 0 && isPrivateIP(cleanHostname)) {
    throw new SsrfError(`SSRF blocked: Fetching from private or loopback IP range (${cleanHostname}) is strictly prohibited.`);
  }

  // Resolve all DNS records
  let records: Array<{ address: string; family: number }>;
  try {
    records = await dns.promises.lookup(cleanHostname, { all: true });
  } catch (dnsErr: any) {
    if (dnsErr instanceof SsrfError) throw dnsErr;
    throw new ValidationError(`Failed to resolve hostname: ${parsedUrl.hostname}`, 400);
  }

  if (!records || records.length === 0) {
    throw new ValidationError(`Failed to resolve hostname: ${parsedUrl.hostname}`, 400);
  }

  // Validate ALL resolved IP addresses
  for (const record of records) {
    if (isPrivateIP(record.address)) {
      throw new SsrfError(
        `SSRF blocked: Fetching from private or loopback IP range (${record.address}) is strictly prohibited.`
      );
    }
  }

  return parsedUrl;
}

/**
 * Executes an HTTP GET request with manual redirect handling and hop-by-hop
 * SSRF validation. Up to maxRedirects (default 5) are supported.
 * If any redirect hop targets an internal/private address or invalid scheme/port,
 * it is rejected before establishing the connection.
 */
export async function fetchWithRedirectValidation(
  initialUrl: string,
  maxRedirects = MAX_REDIRECTS
): Promise<{ response: Response; finalUrl: string }> {
  let currentUrl = initialUrl;
  let hops = 0;

  while (hops <= maxRedirects) {
    // Validate current URL (hop 0 or redirect target)
    const validUrl = await validateUrlSecurity(currentUrl);

    const response = await fetch(validUrl.href, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 ATS-Job-Fetcher/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5,tr;q=0.3',
      },
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) {
        throw new ValidationError(`Redirect response (${response.status}) missing Location header`, 400);
      }
      hops++;
      if (hops > maxRedirects) {
        throw new ValidationError(`Too many redirects (exceeded limit of ${maxRedirects})`, 400);
      }
      // Resolve relative redirect against the current hop's URL
      currentUrl = new URL(location, validUrl.href).href;
      continue;
    }

    if (!response.ok) {
      throw new ValidationError(`Failed to fetch URL: ${response.status} ${response.statusText}`, 422);
    }

    return { response, finalUrl: validUrl.href };
  }

  throw new ValidationError(`Too many redirects (exceeded limit of ${maxRedirects})`, 400);
}
