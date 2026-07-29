import { describe, expect, it } from 'vitest';
import {
  bigIntToIPv6,
  calculateIPv6Subnet,
  compressIPv6,
  detectIPv6AddressType,
  expandIPv6,
  ipv6ToBigInt,
  subnetIPv6,
} from '../lib/subnet-engine/ipv6';

describe('expandIPv6', () => {
  it('expands a compressed address to 8 full groups', () => {
    expect(expandIPv6('2001:db8::1')).toBe('2001:0db8:0000:0000:0000:0000:0000:0001');
  });

  it('expands "::" to all zeros', () => {
    expect(expandIPv6('::')).toBe('0000:0000:0000:0000:0000:0000:0000:0000');
  });

  it('expands an IPv4-mapped address', () => {
    expect(expandIPv6('::ffff:192.168.1.1')).toBe('0000:0000:0000:0000:0000:ffff:c0a8:0101');
  });
});

describe('compressIPv6', () => {
  it('compresses the longest run of zero groups', () => {
    expect(compressIPv6('2001:0db8:0000:0000:0000:0000:0000:0001')).toBe('2001:db8::1');
  });

  it('does not compress a single zero group (RFC 5952)', () => {
    expect(compressIPv6('2001:0db8:0000:0001:0000:0000:0000:0002')).toBe('2001:db8:0:1::2');
  });

  it('handles the unspecified and loopback addresses', () => {
    expect(compressIPv6('0000:0000:0000:0000:0000:0000:0000:0000')).toBe('::');
    expect(compressIPv6('0000:0000:0000:0000:0000:0000:0000:0001')).toBe('::1');
  });
});

describe('ipv6ToBigInt / bigIntToIPv6 round-trip', () => {
  it('round-trips a variety of addresses', () => {
    for (const addr of ['2001:db8::1', '::1', 'fe80::1', 'ff02::1', '2001:db8:abcd:1234::5678']) {
      const big = ipv6ToBigInt(addr);
      const back = bigIntToIPv6(big);
      expect(ipv6ToBigInt(back)).toBe(big);
    }
  });
});

describe('calculateIPv6Subnet', () => {
  it('computes network prefix and range for a /64', () => {
    const r = calculateIPv6Subnet('2001:db8::1', 64);
    expect(r.networkPrefix).toBe('2001:db8::');
    expect(r.firstAddressCompressed).toBe('2001:db8::');
    expect(r.lastAddressCompressed).toBe('2001:db8::ffff:ffff:ffff:ffff');
    expect(r.totalAddresses).toBe('18446744073709551616'); // 2^64
  });

  it('computes a /48', () => {
    const r = calculateIPv6Subnet('2001:db8:1234:5678::1', 48);
    expect(r.networkPrefix).toBe('2001:db8:1234::');
  });

  it('handles /128 as a single address', () => {
    const r = calculateIPv6Subnet('2001:db8::1', 128);
    expect(r.firstAddressCompressed).toBe(r.lastAddressCompressed);
    expect(r.totalAddresses).toBe('1');
  });
});

describe('detectIPv6AddressType', () => {
  it('identifies loopback and unspecified', () => {
    expect(detectIPv6AddressType('::1').type).toBe('loopback');
    expect(detectIPv6AddressType('::').type).toBe('unspecified');
  });

  it('identifies link-local and unique-local', () => {
    expect(detectIPv6AddressType('fe80::1').type).toBe('link-local');
    expect(detectIPv6AddressType('fd00::1').type).toBe('unique-local');
  });

  it('identifies multicast and documentation ranges', () => {
    expect(detectIPv6AddressType('ff02::1').type).toBe('multicast');
    expect(detectIPv6AddressType('2001:db8::1').type).toBe('documentation');
  });

  it('identifies global unicast', () => {
    expect(detectIPv6AddressType('2606:4700:4700::1111').type).toBe('global-unicast');
  });
});

describe('subnetIPv6', () => {
  it('splits a /48 into /64 subnets', () => {
    const result = subnetIPv6({ address: '2001:db8::', prefixLength: 48, newPrefixLength: 64, limit: 10 });
    expect(result.totalSubnets).toBe((2n ** 16n).toString());
    expect(result.truncated).toBe(true);
    expect(result.subnets).toHaveLength(10);
    expect(result.subnets[0].networkPrefix).toBe('2001:db8::');
    expect(result.subnets[1].networkPrefix).toBe('2001:db8:0:1::');
  });

  it('rejects a target prefix shorter than the base prefix', () => {
    const result = subnetIPv6({ address: '2001:db8::', prefixLength: 64, newPrefixLength: 48 });
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
