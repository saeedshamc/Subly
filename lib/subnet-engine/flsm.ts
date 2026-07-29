import type { FLSMResult, FLSMSubnet } from './types';
import { calculateSubnet, subnetsToCidr } from './ipv4';
import { intToIpv4, ipv4ToInt, cidrToMaskInt } from './binary';
import { isValidCIDR, isValidIPv4 } from './validation';

/**
 * Splits a base network into N equal-size subnets. Because subnet counts
 * must be powers of two, the actual number of subnets created may be
 * larger than requested (e.g. asking for 5 subnets yields 8).
 */
export function calculateFLSM(
  baseNetwork: string,
  baseCidr: number,
  subnetsRequested: number
): FLSMResult {
  const errors: string[] = [];

  if (!isValidIPv4(baseNetwork)) {
    throw new Error(`Invalid base network address: ${baseNetwork}`);
  }
  if (!isValidCIDR(baseCidr)) {
    throw new Error(`Invalid base CIDR: /${baseCidr}`);
  }

  const baseMaskInt = cidrToMaskInt(baseCidr);
  const baseNetworkInt = (ipv4ToInt(baseNetwork) & baseMaskInt) >>> 0;

  let conversion;
  try {
    conversion = subnetsToCidr(baseCidr, subnetsRequested);
  } catch (e) {
    errors.push((e as Error).message);
    return {
      baseNetwork: intToIpv4(baseNetworkInt),
      baseCidr,
      subnetsRequested,
      newCidr: baseCidr,
      borrowedBits: 0,
      subnetsCreated: 0,
      subnets: [],
      errors,
      fits: false,
    };
  }

  const { newCidr, subnetsCreated, borrowedBits } = conversion;
  const blockSize = Math.pow(2, 32 - newCidr);

  const subnets: FLSMSubnet[] = [];
  for (let i = 0; i < subnetsCreated; i++) {
    const subnetInt = baseNetworkInt + i * blockSize;
    const result = calculateSubnet(intToIpv4(subnetInt), newCidr);
    subnets.push({ ...result, index: i + 1 });
  }

  return {
    baseNetwork: intToIpv4(baseNetworkInt),
    baseCidr,
    subnetsRequested,
    newCidr,
    borrowedBits,
    subnetsCreated,
    subnets,
    errors,
    fits: true,
  };
}
