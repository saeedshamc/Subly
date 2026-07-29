import type { ValidationError, ValidationResult } from './types';
import { ipv4ToInt, maskIntToCidr } from './binary';

export function isValidIPv4(ip: string): boolean {
  if (typeof ip !== 'string') return false;
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return false;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return false;
    // Reject leading zeros like "01" (ambiguous / historically treated as octal)
    if (part.length > 1 && part.startsWith('0')) return false;
    const n = Number(part);
    if (n < 0 || n > 255) return false;
  }
  return true;
}

export function isValidCIDR(cidr: number | string): boolean {
  const n = typeof cidr === 'string' ? Number(cidr) : cidr;
  return Number.isInteger(n) && n >= 0 && n <= 32;
}

/**
 * A dotted-decimal string is a *valid subnet mask* only if, in binary, all
 * the 1 bits are contiguous and left-aligned (no "10101..." style masks).
 */
export function isValidSubnetMask(mask: string): boolean {
  if (!isValidIPv4(mask)) return false;
  const int = ipv4ToInt(mask);
  // A valid mask, inverted and incremented, must be a power of two (or 0).
  const inverted = (~int) >>> 0;
  return ((inverted + 1) & inverted) === 0;
}

export function maskStringToCidr(mask: string): number {
  return maskIntToCidr(ipv4ToInt(mask));
}

/**
 * Accepts either a CIDR-style string ("24" or "/24") or a dotted-decimal
 * subnet mask ("255.255.255.0") and normalizes to a numeric CIDR prefix.
 * Returns null if neither form is valid.
 */
export function normalizeMaskInput(input: string): number | null {
  const trimmed = input.trim().replace(/^\//, '');
  if (/^\d{1,2}$/.test(trimmed)) {
    const n = Number(trimmed);
    return isValidCIDR(n) ? n : null;
  }
  if (isValidSubnetMask(trimmed)) {
    return maskStringToCidr(trimmed);
  }
  return null;
}

export function validateIPv4Input(ip: string, maskOrCidr: string): ValidationResult {
  const errors: ValidationError[] = [];

  if (!ip || !ip.trim()) {
    errors.push({
      field: 'ip',
      message: 'IP address is required',
      messageKey: 'errors.ipRequired',
    });
  } else if (!isValidIPv4(ip.trim())) {
    errors.push({
      field: 'ip',
      message: `"${ip}" is not a valid IPv4 address (expected four numbers 0-255 separated by dots)`,
      messageKey: 'errors.invalidIPv4',
      params: { value: ip },
    });
  }

  if (!maskOrCidr || !String(maskOrCidr).trim()) {
    errors.push({
      field: 'mask',
      message: 'Subnet mask or CIDR prefix is required',
      messageKey: 'errors.maskRequired',
    });
  } else {
    const normalized = normalizeMaskInput(String(maskOrCidr));
    if (normalized === null) {
      errors.push({
        field: 'mask',
        message: `"${maskOrCidr}" is not a valid CIDR prefix (/0-/32) or contiguous dotted-decimal subnet mask`,
        messageKey: 'errors.invalidMask',
        params: { value: maskOrCidr },
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateHostsRequested(hosts: number | string): ValidationResult {
  const n = typeof hosts === 'string' ? Number(hosts) : hosts;
  const errors: ValidationError[] = [];
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) {
    errors.push({
      field: 'hosts',
      message: 'Number of hosts must be a positive integer',
      messageKey: 'errors.invalidHostCount',
    });
  } else if (n > 4294967294) {
    errors.push({
      field: 'hosts',
      message: 'Number of hosts exceeds the maximum possible in IPv4',
      messageKey: 'errors.hostCountTooLarge',
    });
  }
  return { valid: errors.length === 0, errors };
}

export function validateSubnetsRequested(subnets: number | string): ValidationResult {
  const n = typeof subnets === 'string' ? Number(subnets) : subnets;
  const errors: ValidationError[] = [];
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) {
    errors.push({
      field: 'subnets',
      message: 'Number of subnets must be a positive integer',
      messageKey: 'errors.invalidSubnetCount',
    });
  }
  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// IPv6
// ---------------------------------------------------------------------------

/**
 * Validates an IPv6 address string, including the "::" compression form and
 * the IPv4-mapped tail form (e.g. "::ffff:192.168.1.1").
 */
export function isValidIPv6(address: string): boolean {
  if (typeof address !== 'string' || address.trim() === '') return false;
  let addr = address.trim();

  // Strip an optional zone index, e.g. "fe80::1%eth0"
  addr = addr.split('%')[0];

  if (addr.includes(':::')) return false;
  const doubleColonCount = (addr.match(/::/g) || []).length;
  if (doubleColonCount > 1) return false;

  // Handle an embedded IPv4 tail, e.g. "::ffff:192.168.1.1"
  const ipv4TailMatch = addr.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  let ipv4Tail: string | null = null;
  if (ipv4TailMatch) {
    ipv4Tail = ipv4TailMatch[1];
    if (!isValidIPv4(ipv4Tail)) return false;
    // Replace the IPv4 tail with two hextets worth of zeros for group counting
    addr = addr.slice(0, addr.length - ipv4Tail.length) + '0:0';
  }

  if (doubleColonCount === 1) {
    const [head, tail] = addr.split('::');
    const headGroups = head === '' ? [] : head.split(':');
    const tailGroups = tail === '' ? [] : tail.split(':');
    if (headGroups.length + tailGroups.length > 7) return false;
    return [...headGroups, ...tailGroups].every((g) => /^[0-9a-fA-F]{1,4}$/.test(g));
  }

  const groups = addr.split(':');
  if (groups.length !== 8) return false;
  return groups.every((g) => /^[0-9a-fA-F]{1,4}$/.test(g));
}

export function isValidIPv6PrefixLength(prefix: number | string): boolean {
  const n = typeof prefix === 'string' ? Number(prefix) : prefix;
  return Number.isInteger(n) && n >= 0 && n <= 128;
}

export function validateIPv6Input(address: string, prefixLength: string | number): ValidationResult {
  const errors: ValidationError[] = [];
  if (!address || !address.trim()) {
    errors.push({
      field: 'address',
      message: 'IPv6 address is required',
      messageKey: 'errors.ipv6Required',
    });
  } else if (!isValidIPv6(address.trim())) {
    errors.push({
      field: 'address',
      message: `"${address}" is not a valid IPv6 address`,
      messageKey: 'errors.invalidIPv6',
      params: { value: address },
    });
  }

  if (prefixLength === '' || prefixLength === undefined || prefixLength === null) {
    errors.push({
      field: 'prefixLength',
      message: 'Prefix length is required',
      messageKey: 'errors.prefixRequired',
    });
  } else if (!isValidIPv6PrefixLength(prefixLength)) {
    errors.push({
      field: 'prefixLength',
      message: `"${prefixLength}" is not a valid IPv6 prefix length (/0-/128)`,
      messageKey: 'errors.invalidIPv6Prefix',
      params: { value: prefixLength },
    });
  }

  return { valid: errors.length === 0, errors };
}
