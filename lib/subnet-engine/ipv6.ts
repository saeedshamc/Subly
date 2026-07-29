import type {
  IPv6AddressType,
  IPv6AddressTypeInfo,
  IPv6Result,
  IPv6SubnetRequest,
  IPv6SubnetResult,
} from './types';
import { isValidIPv4, isValidIPv6, isValidIPv6PrefixLength } from './validation';

const GROUP_COUNT = 8;
const TOTAL_BITS = 128n;

/**
 * Fully expands any valid IPv6 address (including "::" compression and
 * IPv4-mapped tails) into 8 colon-separated 4-hex-digit groups.
 */
export function expandIPv6(address: string): string {
  let addr = address.trim();
  const zoneSplit = addr.split('%');
  addr = zoneSplit[0];

  // Convert an embedded IPv4 tail (e.g. "::ffff:192.168.1.1") to two hex groups.
  const ipv4TailMatch = addr.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (ipv4TailMatch) {
    const ipv4Tail = ipv4TailMatch[1];
    if (!isValidIPv4(ipv4Tail)) throw new Error(`Invalid embedded IPv4 address: ${ipv4Tail}`);
    const octets = ipv4Tail.split('.').map(Number);
    const hi = ((octets[0] << 8) | octets[1]).toString(16).padStart(4, '0');
    const lo = ((octets[2] << 8) | octets[3]).toString(16).padStart(4, '0');
    addr = addr.slice(0, addr.length - ipv4Tail.length) + `${hi}:${lo}`;
  }

  let groups: string[];
  if (addr.includes('::')) {
    const [head, tail] = addr.split('::');
    const headGroups = head === '' ? [] : head.split(':');
    const tailGroups = tail === '' ? [] : tail.split(':');
    const missing = GROUP_COUNT - headGroups.length - tailGroups.length;
    groups = [...headGroups, ...Array(missing).fill('0'), ...tailGroups];
  } else {
    groups = addr.split(':');
  }

  if (groups.length !== GROUP_COUNT) {
    throw new Error(`Invalid IPv6 address: ${address}`);
  }

  return groups.map((g) => g.padStart(4, '0').toLowerCase()).join(':');
}

/**
 * Produces the canonical, RFC 5952 compressed form: lowercase hex, no
 * leading zeros within a group, and the single longest run of all-zero
 * groups replaced with "::" (ties broken by the leftmost run; runs of
 * length 1 are not compressed).
 */
export function compressIPv6(address: string): string {
  const expanded = expandIPv6(address);
  const groups = expanded.split(':').map((g) => g.replace(/^0+(?=.)/, ''));

  // Find the longest run of consecutive "0" groups.
  let bestStart = -1;
  let bestLen = 0;
  let curStart = -1;
  let curLen = 0;
  for (let i = 0; i < groups.length; i++) {
    if (groups[i] === '0') {
      if (curStart === -1) curStart = i;
      curLen += 1;
      if (curLen > bestLen) {
        bestLen = curLen;
        bestStart = curStart;
      }
    } else {
      curStart = -1;
      curLen = 0;
    }
  }

  if (bestLen < 2) {
    return groups.join(':');
  }

  const before = groups.slice(0, bestStart);
  const after = groups.slice(bestStart + bestLen);
  const beforeStr = before.join(':');
  const afterStr = after.join(':');

  if (before.length === 0 && after.length === 0) return '::';
  if (before.length === 0) return `::${afterStr}`;
  if (after.length === 0) return `${beforeStr}::`;
  return `${beforeStr}::${afterStr}`;
}

export function ipv6ToBigInt(address: string): bigint {
  const expanded = expandIPv6(address);
  const groups = expanded.split(':');
  let result = 0n;
  for (const g of groups) {
    result = (result << 16n) | BigInt(parseInt(g, 16));
  }
  return result;
}

export function bigIntToIPv6(value: bigint): string {
  let v = value;
  const mask = 0xffffn;
  const groups: string[] = [];
  for (let i = 0; i < GROUP_COUNT; i++) {
    groups.unshift((v & mask).toString(16).padStart(4, '0'));
    v >>= 16n;
  }
  return groups.join(':');
}

export function prefixToMaskBigInt(prefixLength: number): bigint {
  if (prefixLength === 0) return 0n;
  return ((1n << TOTAL_BITS) - 1n) ^ ((1n << (TOTAL_BITS - BigInt(prefixLength))) - 1n);
}

const DOCUMENTATION_PREFIX = ipv6ToBigInt('2001:db8::');
const LINK_LOCAL_PREFIX = ipv6ToBigInt('fe80::');
const UNIQUE_LOCAL_PREFIX = ipv6ToBigInt('fc00::');
const MULTICAST_PREFIX = ipv6ToBigInt('ff00::');
const IPV4_MAPPED_PREFIX = ipv6ToBigInt('::ffff:0:0');
const GLOBAL_UNICAST_PREFIX = ipv6ToBigInt('2000::');

function maskFor(bits: number): bigint {
  return prefixToMaskBigInt(bits);
}

export function detectIPv6AddressType(address: string): IPv6AddressTypeInfo {
  const value = ipv6ToBigInt(address);

  if (value === 0n) {
    return { type: 'unspecified', rfcs: ['RFC 4291'] };
  }
  if (value === 1n) {
    return { type: 'loopback', rfcs: ['RFC 4291'] };
  }
  if ((value & maskFor(96)) === IPV4_MAPPED_PREFIX) {
    return { type: 'ipv4-mapped', rfcs: ['RFC 4291'] };
  }
  if ((value & maskFor(32)) === DOCUMENTATION_PREFIX) {
    return { type: 'documentation', rfcs: ['RFC 3849'] };
  }
  if ((value & maskFor(10)) === LINK_LOCAL_PREFIX) {
    return { type: 'link-local', rfcs: ['RFC 4291'] };
  }
  if ((value & maskFor(7)) === UNIQUE_LOCAL_PREFIX) {
    return { type: 'unique-local', rfcs: ['RFC 4193'] };
  }
  if ((value & maskFor(8)) === MULTICAST_PREFIX) {
    return { type: 'multicast', rfcs: ['RFC 4291'] };
  }
  if ((value & maskFor(3)) === GLOBAL_UNICAST_PREFIX) {
    return { type: 'global-unicast', rfcs: ['RFC 3587'] };
  }
  return { type: 'reserved', rfcs: ['RFC 4291'] };
}

export function calculateIPv6Subnet(address: string, prefixLength: number): IPv6Result {
  if (!isValidIPv6(address)) throw new Error(`Invalid IPv6 address: ${address}`);
  if (!isValidIPv6PrefixLength(prefixLength)) throw new Error(`Invalid IPv6 prefix length: /${prefixLength}`);

  const addrInt = ipv6ToBigInt(address);
  const mask = prefixToMaskBigInt(prefixLength);
  const networkInt = addrInt & mask;
  const hostBits = TOTAL_BITS - BigInt(prefixLength);
  const blockSize = 1n << hostBits;
  const lastInt = networkInt + blockSize - 1n;

  const expanded = expandIPv6(address);

  return {
    input: { address, prefixLength },
    compressed: compressIPv6(address),
    expanded,
    networkPrefix: compressIPv6(bigIntToIPv6(networkInt)),
    networkPrefixExpanded: bigIntToIPv6(networkInt),
    firstAddress: bigIntToIPv6(networkInt),
    firstAddressCompressed: compressIPv6(bigIntToIPv6(networkInt)),
    lastAddress: bigIntToIPv6(lastInt),
    lastAddressCompressed: compressIPv6(bigIntToIPv6(lastInt)),
    prefixLength,
    totalAddresses: blockSize.toString(),
    addressTypeInfo: detectIPv6AddressType(address),
  };
}

/**
 * Splits a base IPv6 prefix into equal-size subnets at a longer (more
 * specific) prefix length, e.g. a /48 split into /64s. The subnet space
 * can be astronomically large, so `limit` caps how many are actually
 * enumerated and `truncated` signals when the cap was hit.
 */
export function subnetIPv6(request: IPv6SubnetRequest): IPv6SubnetResult {
  const { address, prefixLength, newPrefixLength, limit = 1000 } = request;
  const errors: string[] = [];

  if (!isValidIPv6(address)) errors.push(`Invalid IPv6 address: ${address}`);
  if (!isValidIPv6PrefixLength(prefixLength)) errors.push(`Invalid base prefix length: /${prefixLength}`);
  if (!isValidIPv6PrefixLength(newPrefixLength)) errors.push(`Invalid target prefix length: /${newPrefixLength}`);
  if (errors.length === 0 && newPrefixLength < prefixLength) {
    errors.push(`Target prefix /${newPrefixLength} must be longer (more specific) than base /${prefixLength}`);
  }

  if (errors.length > 0) {
    return {
      baseAddress: address,
      basePrefixLength: prefixLength,
      newPrefixLength,
      totalSubnets: '0',
      subnets: [],
      truncated: false,
      errors,
    };
  }

  const baseMask = prefixToMaskBigInt(prefixLength);
  const baseNetworkInt = ipv6ToBigInt(address) & baseMask;
  const borrowedBits = BigInt(newPrefixLength - prefixLength);
  const totalSubnets = 1n << borrowedBits;
  const subnetBlockSize = 1n << (TOTAL_BITS - BigInt(newPrefixLength));

  const countToGenerate = totalSubnets < BigInt(limit) ? Number(totalSubnets) : limit;
  const subnets: IPv6Result[] = [];
  for (let i = 0; i < countToGenerate; i++) {
    const subnetInt = baseNetworkInt + BigInt(i) * subnetBlockSize;
    subnets.push(calculateIPv6Subnet(bigIntToIPv6(subnetInt), newPrefixLength));
  }

  return {
    baseAddress: address,
    basePrefixLength: prefixLength,
    newPrefixLength,
    totalSubnets: totalSubnets.toString(),
    subnets,
    truncated: totalSubnets > BigInt(countToGenerate),
    errors: [],
  };
}
