import type { BinaryOctets } from './types';

/**
 * Converts a dotted-decimal IPv4 string to an unsigned 32-bit integer.
 * Assumes the string has already been validated by validation.ts.
 */
export function ipv4ToInt(ip: string): number {
  const parts = ip.split('.').map(Number);
  return (
    ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
  );
}

/**
 * Converts an unsigned 32-bit integer back to dotted-decimal notation.
 */
export function intToIpv4(int: number): string {
  return [
    (int >>> 24) & 255,
    (int >>> 16) & 255,
    (int >>> 8) & 255,
    int & 255,
  ].join('.');
}

/**
 * Builds a CIDR prefix (/0 - /32) as an unsigned 32-bit mask integer.
 */
export function cidrToMaskInt(cidr: number): number {
  if (cidr === 0) return 0;
  return (0xffffffff << (32 - cidr)) >>> 0;
}

/**
 * Counts the number of set bits (1s) in a dotted-decimal mask, returning
 * the CIDR prefix length. Does NOT validate contiguity - use validation.ts
 * isValidSubnetMask for that first.
 */
export function maskIntToCidr(maskInt: number): number {
  let count = 0;
  let n = maskInt >>> 0;
  while (n) {
    count += n & 1;
    n >>>= 1;
  }
  return count;
}

/**
 * Renders a single octet (0-255) as an 8-character binary string.
 */
export function octetToBinary(octet: number): string {
  return octet.toString(2).padStart(8, '0');
}

/**
 * Produces the full binary breakdown (per-octet, full string, dotted string)
 * for a dotted-decimal IPv4 address or mask.
 */
export function ipv4ToBinaryOctets(ip: string): BinaryOctets {
  const octets = ip.split('.').map((p) => octetToBinary(Number(p)));
  return {
    octets,
    full: octets.join(''),
    dotted: octets.join('.'),
  };
}

/**
 * Same as ipv4ToBinaryOctets but starting from a raw 32-bit integer.
 */
export function intToBinaryOctets(int: number): BinaryOctets {
  return ipv4ToBinaryOctets(intToIpv4(int));
}

/**
 * Computes the wildcard mask (bitwise inverse of the subnet mask) as an
 * integer.
 */
export function wildcardIntFromMaskInt(maskInt: number): number {
  return (~maskInt) >>> 0;
}
