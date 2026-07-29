/**
 * Shared types for the pure, framework-independent subnetting engine.
 * Nothing in this file (or anywhere in /lib/subnet-engine) imports React/Next.
 */

export type IPv4AddressClass = 'A' | 'B' | 'C' | 'D' | 'E';

export type IPv4SpecialType =
  | 'public'
  | 'private'
  | 'loopback'
  | 'link-local'
  | 'multicast'
  | 'reserved'
  | 'broadcast'
  | 'this-network'
  | 'shared-address-space' // RFC 6598 (CGNAT) 100.64.0.0/10
  | 'benchmarking' // RFC 2544 198.18.0.0/15
  | 'documentation'; // RFC 5737 TEST-NET-1/2/3

export interface BinaryOctets {
  /** Each octet as an 8-character '0'/'1' string, e.g. ['11000000','10101000','00000001','00000000'] */
  octets: string[];
  /** Full 32-bit string with no separators */
  full: string;
  /** Dotted binary string, e.g. "11000000.10101000.00000001.00000000" */
  dotted: string;
}

export interface AddressTypeInfo {
  addressClass: IPv4AddressClass;
  types: IPv4SpecialType[];
  isPrivate: boolean;
  isPublic: boolean;
  /** Human readable RFC reference(s), e.g. ["RFC 1918"] */
  rfcs: string[];
}

export interface SubnetResult {
  input: {
    ip: string;
    cidr: number;
  };
  networkAddress: string;
  broadcastAddress: string;
  subnetMask: string;
  wildcardMask: string;
  cidr: number;
  firstUsableHost: string | null;
  lastUsableHost: string | null;
  totalHosts: number;
  usableHosts: number;
  addressClass: IPv4AddressClass;
  addressTypeInfo: AddressTypeInfo;
  binary: {
    ip: BinaryOctets;
    mask: BinaryOctets;
    network: BinaryOctets;
    broadcast: BinaryOctets;
    wildcard: BinaryOctets;
  };
  /** Number of host bits and network bits, used by the "show work" mode */
  networkBits: number;
  hostBits: number;
}

export interface HostsToCidrResult {
  hostsRequested: number;
  cidr: number;
  subnetMask: string;
  totalHosts: number;
  usableHosts: number;
  hostBits: number;
}

export interface SubnetsToCidrResult {
  subnetsRequested: number;
  baseCidr: number;
  newCidr: number;
  subnetMask: string;
  borrowedBits: number;
  subnetsCreated: number;
  hostsPerSubnet: number;
  usableHostsPerSubnet: number;
}

export interface VLSMRequest {
  /** Optional label, e.g. "Sales LAN" */
  name: string;
  hostsNeeded: number;
}

export interface VLSMAllocation extends SubnetResult {
  name: string;
  hostsRequested: number;
  blockSize: number;
}

export interface VLSMResult {
  baseNetwork: string;
  baseCidr: number;
  allocations: VLSMAllocation[];
  unallocated: {
    networkAddress: string;
    cidr: number;
    totalAddresses: number;
  }[];
  totalBaseAddresses: number;
  totalAllocatedAddresses: number;
  totalUnallocatedAddresses: number;
  errors: string[];
  fits: boolean;
}

export interface FLSMSubnet extends SubnetResult {
  index: number;
}

export interface FLSMResult {
  baseNetwork: string;
  baseCidr: number;
  subnetsRequested: number;
  newCidr: number;
  borrowedBits: number;
  subnetsCreated: number;
  subnets: FLSMSubnet[];
  errors: string[];
  fits: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
  messageKey: string; // i18n key, e.g. "errors.invalidIPv4"
  params?: Record<string, string | number>;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// ---------------------------------------------------------------------------
// IPv6
// ---------------------------------------------------------------------------

export type IPv6AddressType =
  | 'global-unicast'
  | 'link-local'
  | 'unique-local'
  | 'multicast'
  | 'loopback'
  | 'unspecified'
  | 'documentation'
  | 'ipv4-mapped'
  | 'reserved';

export interface IPv6AddressTypeInfo {
  type: IPv6AddressType;
  rfcs: string[];
}

export interface IPv6Result {
  input: {
    address: string;
    prefixLength: number;
  };
  compressed: string;
  expanded: string;
  networkPrefix: string; // compressed
  networkPrefixExpanded: string;
  firstAddress: string; // expanded, for clarity
  firstAddressCompressed: string;
  lastAddress: string;
  lastAddressCompressed: string;
  prefixLength: number;
  totalAddresses: string; // BigInt as string, can be astronomically large
  addressTypeInfo: IPv6AddressTypeInfo;
}

export interface IPv6SubnetRequest {
  address: string;
  prefixLength: number;
  /** Target prefix length to split into, e.g. 64 -> /64s from a /48 */
  newPrefixLength: number;
  /** Cap on how many subnets to actually enumerate (this can be enormous) */
  limit?: number;
}

export interface IPv6SubnetResult {
  baseAddress: string;
  basePrefixLength: number;
  newPrefixLength: number;
  totalSubnets: string; // BigInt as string
  subnets: IPv6Result[];
  truncated: boolean;
  errors: string[];
}
