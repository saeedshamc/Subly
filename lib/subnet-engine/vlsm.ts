import type { VLSMAllocation, VLSMRequest, VLSMResult } from './types';
import { calculateSubnet, hostsToCidr } from './ipv4';
import { intToIpv4, ipv4ToInt, cidrToMaskInt } from './binary';
import { isValidCIDR, isValidIPv4 } from './validation';

/**
 * Splits an address range [startInt, endInt) into the minimum number of
 * CIDR-aligned blocks. Used to describe leftover/unallocated space after
 * VLSM allocation, since a remainder is rarely a single clean subnet.
 */
function decomposeRangeIntoBlocks(
  startInt: number,
  endInt: number
): { networkAddress: string; cidr: number; totalAddresses: number }[] {
  const blocks: { networkAddress: string; cidr: number; totalAddresses: number }[] = [];
  let start = startInt >>> 0;
  const end = endInt >>> 0;

  while (start < end) {
    const remaining = end - start;
    // Largest power-of-two block size that both fits in the remaining
    // space AND is aligned with `start` (start must be a multiple of it).
    let maxSizeByAlignment = start === 0 ? 0x100000000 : start & -start;
    let size = 1;
    while (size * 2 <= remaining && size * 2 <= maxSizeByAlignment) {
      size *= 2;
    }
    const cidr = 32 - Math.log2(size);
    blocks.push({
      networkAddress: intToIpv4(start),
      cidr,
      totalAddresses: size,
    });
    start += size;
  }

  return blocks;
}

export function calculateVLSM(
  baseNetwork: string,
  baseCidr: number,
  requests: VLSMRequest[]
): VLSMResult {
  const errors: string[] = [];

  if (!isValidIPv4(baseNetwork)) {
    throw new Error(`Invalid base network address: ${baseNetwork}`);
  }
  if (!isValidCIDR(baseCidr)) {
    throw new Error(`Invalid base CIDR: /${baseCidr}`);
  }

  const baseMaskInt = cidrToMaskInt(baseCidr);
  const baseNetworkInt = (ipv4ToInt(baseNetwork) & baseMaskInt) >>> 0;
  const baseSize = Math.pow(2, 32 - baseCidr);
  const baseEndInt = baseNetworkInt + baseSize; // may exceed 2^32-1 only if baseCidr=0, handled by number type

  // Sort largest-to-smallest so sequential allocation stays naturally
  // aligned to each block's own power-of-two boundary (standard VLSM rule).
  const withSizes = requests.map((req, originalIndex) => {
    if (!Number.isInteger(req.hostsNeeded) || req.hostsNeeded < 1) {
      errors.push(`"${req.name || `Subnet ${originalIndex + 1}`}": host count must be a positive integer`);
    }
    const safeHosts = Math.max(1, req.hostsNeeded || 1);
    const { cidr, hostBits } = hostsToCidr(safeHosts);
    return { ...req, originalIndex, cidr, blockSize: Math.pow(2, hostBits) };
  });

  const sorted = [...withSizes].sort((a, b) => b.blockSize - a.blockSize || a.originalIndex - b.originalIndex);

  const allocations: VLSMAllocation[] = [];
  let pointer = baseNetworkInt;

  for (const req of sorted) {
    if (pointer + req.blockSize > baseEndInt) {
      errors.push(
        `"${req.name || 'Unnamed subnet'}" needs ${req.hostsNeeded} hosts (/${req.cidr}, ${req.blockSize} addresses) but there is not enough remaining space in ${baseNetwork}/${baseCidr}`
      );
      continue;
    }
    const subnetResult = calculateSubnet(intToIpv4(pointer), req.cidr);
    allocations.push({
      ...subnetResult,
      name: req.name || `Subnet ${req.originalIndex + 1}`,
      hostsRequested: req.hostsNeeded,
      blockSize: req.blockSize,
    });
    pointer += req.blockSize;
  }

  const unallocated = decomposeRangeIntoBlocks(pointer, baseEndInt);
  const totalAllocatedAddresses = allocations.reduce((sum, a) => sum + a.blockSize, 0);
  const totalUnallocatedAddresses = unallocated.reduce((sum, u) => sum + u.totalAddresses, 0);

  // Restore original request order in the output for readability, while
  // the allocation *pointer walk* above already happened largest-first.
  allocations.sort((a, b) => {
    const aIdx = requests.findIndex((r) => r.name === a.name && r.hostsNeeded === a.hostsRequested);
    const bIdx = requests.findIndex((r) => r.name === b.name && r.hostsNeeded === b.hostsRequested);
    return aIdx - bIdx;
  });

  return {
    baseNetwork: intToIpv4(baseNetworkInt),
    baseCidr,
    allocations,
    unallocated,
    totalBaseAddresses: baseSize,
    totalAllocatedAddresses,
    totalUnallocatedAddresses,
    errors,
    fits: errors.length === 0,
  };
}
