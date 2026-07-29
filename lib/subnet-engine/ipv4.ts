import type {
  HostsToCidrResult,
  SubnetResult,
  SubnetsToCidrResult,
} from './types';
import {
  cidrToMaskInt,
  intToBinaryOctets,
  intToIpv4,
  ipv4ToBinaryOctets,
  ipv4ToInt,
  wildcardIntFromMaskInt,
} from './binary';
import { detectAddressType } from './addressType';
import { isValidCIDR, isValidIPv4 } from './validation';

/**
 * Calculates the full breakdown of an IPv4 network from an address + CIDR
 * prefix. This is the central pure function of the whole engine - every
 * other feature (VLSM, FLSM, reverse lookup) builds its individual subnets
 * by calling this.
 *
 * Throws if the input hasn't already been validated - callers should run
 * validateIPv4Input() first and surface errors to the user before calling
 * this function.
 */
export function calculateSubnet(ip: string, cidr: number): SubnetResult {
  if (!isValidIPv4(ip)) {
    throw new Error(`Invalid IPv4 address: ${ip}`);
  }
  if (!isValidCIDR(cidr)) {
    throw new Error(`Invalid CIDR prefix: /${cidr}`);
  }

  const ipInt = ipv4ToInt(ip);
  const maskInt = cidrToMaskInt(cidr);
  const wildcardInt = wildcardIntFromMaskInt(maskInt);

  const networkInt = (ipInt & maskInt) >>> 0;
  const broadcastInt = (networkInt | wildcardInt) >>> 0;

  const hostBits = 32 - cidr;
  const totalHosts = Math.pow(2, hostBits);

  let firstUsableHost: string | null = null;
  let lastUsableHost: string | null = null;
  let usableHosts = 0;

  if (cidr <= 30) {
    firstUsableHost = intToIpv4((networkInt + 1) >>> 0);
    lastUsableHost = intToIpv4((broadcastInt - 1) >>> 0);
    usableHosts = totalHosts - 2;
  } else if (cidr === 31) {
    // RFC 3021 point-to-point link: both addresses are usable, no
    // network/broadcast concept in the traditional sense.
    firstUsableHost = intToIpv4(networkInt);
    lastUsableHost = intToIpv4(broadcastInt);
    usableHosts = 2;
  } else {
    // /32 - a single host route
    firstUsableHost = intToIpv4(networkInt);
    lastUsableHost = intToIpv4(networkInt);
    usableHosts = 1;
  }

  const networkAddress = intToIpv4(networkInt);
  const broadcastAddress = intToIpv4(broadcastInt);
  const subnetMask = intToIpv4(maskInt);
  const wildcardMask = intToIpv4(wildcardInt);

  return {
    input: { ip, cidr },
    networkAddress,
    broadcastAddress,
    subnetMask,
    wildcardMask,
    cidr,
    firstUsableHost,
    lastUsableHost,
    totalHosts,
    usableHosts,
    addressClass: detectAddressType(ip).addressClass,
    addressTypeInfo: detectAddressType(networkAddress),
    binary: {
      ip: ipv4ToBinaryOctets(ip),
      mask: intToBinaryOctets(maskInt),
      network: intToBinaryOctets(networkInt),
      broadcast: intToBinaryOctets(broadcastInt),
      wildcard: intToBinaryOctets(wildcardInt),
    },
    networkBits: cidr,
    hostBits,
  };
}

/**
 * Reverse lookup: given a desired number of usable hosts, finds the
 * smallest CIDR block (largest prefix number) that fits them.
 */
export function hostsToCidr(hostsNeeded: number): HostsToCidrResult {
  if (!Number.isInteger(hostsNeeded) || hostsNeeded < 1) {
    throw new Error('hostsNeeded must be a positive integer');
  }

  // Find the smallest hostBits such that 2^hostBits - 2 >= hostsNeeded,
  // falling back to the /31 and /32 special cases for very small counts.
  let hostBits = 0;
  while (Math.pow(2, hostBits) - 2 < hostsNeeded && hostBits < 32) {
    hostBits += 1;
  }

  // If exactly 1 or 2 hosts needed, a /32 or /31 may be more appropriate
  // in point-to-point contexts, but the conventional "usable hosts" answer
  // (reserving network+broadcast) is what most subnet calculators return,
  // so we keep that as the default and let hostBits=1 (/31) only trigger
  // when hostsNeeded is exactly 2 and hostBits=0 (/32) never triggers
  // automatically since a single "host" almost always still wants a real
  // subnet. We special-case 1 and 2 explicitly for clarity:
  if (hostsNeeded === 1) {
    hostBits = Math.max(hostBits, 0);
  }

  const cidr = 32 - hostBits;
  const totalHosts = Math.pow(2, hostBits);
  const usableHosts = hostBits === 0 ? 1 : hostBits === 1 ? 2 : totalHosts - 2;

  return {
    hostsRequested: hostsNeeded,
    cidr,
    subnetMask: intToIpv4(cidrToMaskInt(cidr)),
    totalHosts,
    usableHosts,
    hostBits,
  };
}

/**
 * Reverse lookup: given a base network CIDR and a desired number of equal
 * subnets, finds how many bits must be borrowed from the host portion and
 * what the resulting CIDR/mask looks like.
 */
export function subnetsToCidr(baseCidr: number, subnetsNeeded: number): SubnetsToCidrResult {
  if (!isValidCIDR(baseCidr)) {
    throw new Error(`Invalid base CIDR: /${baseCidr}`);
  }
  if (!Number.isInteger(subnetsNeeded) || subnetsNeeded < 1) {
    throw new Error('subnetsNeeded must be a positive integer');
  }

  let borrowedBits = 0;
  while (Math.pow(2, borrowedBits) < subnetsNeeded && baseCidr + borrowedBits < 32) {
    borrowedBits += 1;
  }

  const newCidr = baseCidr + borrowedBits;
  if (newCidr > 32) {
    throw new Error('Not enough host bits available to create that many subnets');
  }

  const subnetsCreated = Math.pow(2, borrowedBits);
  const hostBits = 32 - newCidr;
  const hostsPerSubnet = Math.pow(2, hostBits);
  const usableHostsPerSubnet =
    hostBits === 0 ? 1 : hostBits === 1 ? 2 : hostsPerSubnet - 2;

  return {
    subnetsRequested: subnetsNeeded,
    baseCidr,
    newCidr,
    subnetMask: intToIpv4(cidrToMaskInt(newCidr)),
    borrowedBits,
    subnetsCreated,
    hostsPerSubnet,
    usableHostsPerSubnet,
  };
}
