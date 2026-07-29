import type { AddressTypeInfo, IPv4AddressClass, IPv4SpecialType } from './types';
import { ipv4ToInt } from './binary';

interface Range {
  base: string;
  cidr: number;
  type: IPv4SpecialType;
  rfc: string;
}

// Ordered; first match per "type family" wins, but we collect *all* matches
// so e.g. 127.0.0.1 reports both loopback and (technically) class A.
const SPECIAL_RANGES: Range[] = [
  { base: '0.0.0.0', cidr: 8, type: 'this-network', rfc: 'RFC 791' },
  { base: '10.0.0.0', cidr: 8, type: 'private', rfc: 'RFC 1918' },
  { base: '100.64.0.0', cidr: 10, type: 'shared-address-space', rfc: 'RFC 6598' },
  { base: '127.0.0.0', cidr: 8, type: 'loopback', rfc: 'RFC 1122' },
  { base: '169.254.0.0', cidr: 16, type: 'link-local', rfc: 'RFC 3927' },
  { base: '172.16.0.0', cidr: 12, type: 'private', rfc: 'RFC 1918' },
  { base: '192.0.0.0', cidr: 24, type: 'reserved', rfc: 'RFC 6890' },
  { base: '192.0.2.0', cidr: 24, type: 'documentation', rfc: 'RFC 5737 (TEST-NET-1)' },
  { base: '192.168.0.0', cidr: 16, type: 'private', rfc: 'RFC 1918' },
  { base: '198.18.0.0', cidr: 15, type: 'benchmarking', rfc: 'RFC 2544' },
  { base: '198.51.100.0', cidr: 24, type: 'documentation', rfc: 'RFC 5737 (TEST-NET-2)' },
  { base: '203.0.113.0', cidr: 24, type: 'documentation', rfc: 'RFC 5737 (TEST-NET-3)' },
  { base: '224.0.0.0', cidr: 4, type: 'multicast', rfc: 'RFC 5771' },
  { base: '240.0.0.0', cidr: 4, type: 'reserved', rfc: 'RFC 1112' },
  { base: '255.255.255.255', cidr: 32, type: 'broadcast', rfc: 'RFC 919' },
];

function inRange(ipInt: number, base: string, cidr: number): boolean {
  const baseInt = ipv4ToInt(base);
  if (cidr === 0) return true;
  const maskInt = (0xffffffff << (32 - cidr)) >>> 0;
  return (ipInt & maskInt) >>> 0 === (baseInt & maskInt) >>> 0;
}

export function getIPv4Class(ip: string): IPv4AddressClass {
  const firstOctet = Number(ip.split('.')[0]);
  if (firstOctet <= 127) return 'A';
  if (firstOctet <= 191) return 'B';
  if (firstOctet <= 223) return 'C';
  if (firstOctet <= 239) return 'D';
  return 'E';
}

export function detectAddressType(ip: string): AddressTypeInfo {
  const ipInt = ipv4ToInt(ip);
  const matches = SPECIAL_RANGES.filter((r) => inRange(ipInt, r.base, r.cidr));

  const types: IPv4SpecialType[] = matches.map((m) => m.type);
  const rfcs = Array.from(new Set(matches.map((m) => m.rfc)));
  const isPrivate = types.includes('private');
  const isSpecial = matches.length > 0;

  return {
    addressClass: getIPv4Class(ip),
    types: types.length > 0 ? types : ['public'],
    isPrivate,
    isPublic: !isSpecial,
    rfcs,
  };
}
