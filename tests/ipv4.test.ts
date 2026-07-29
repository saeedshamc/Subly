import { describe, expect, it } from 'vitest';
import { calculateSubnet, hostsToCidr, subnetsToCidr } from '../lib/subnet-engine/ipv4';

describe('calculateSubnet - standard subnetting', () => {
  it('computes a typical /24', () => {
    const r = calculateSubnet('192.168.1.10', 24);
    expect(r.networkAddress).toBe('192.168.1.0');
    expect(r.broadcastAddress).toBe('192.168.1.255');
    expect(r.subnetMask).toBe('255.255.255.0');
    expect(r.wildcardMask).toBe('0.0.0.255');
    expect(r.firstUsableHost).toBe('192.168.1.1');
    expect(r.lastUsableHost).toBe('192.168.1.254');
    expect(r.usableHosts).toBe(254);
    expect(r.totalHosts).toBe(256);
  });

  it('computes a /27 boundary correctly', () => {
    const r = calculateSubnet('10.0.0.40', 27);
    expect(r.networkAddress).toBe('10.0.0.32');
    expect(r.broadcastAddress).toBe('10.0.0.63');
    expect(r.usableHosts).toBe(30);
  });

  it('handles a class B network', () => {
    const r = calculateSubnet('172.16.5.9', 16);
    expect(r.networkAddress).toBe('172.16.0.0');
    expect(r.broadcastAddress).toBe('172.16.255.255');
    expect(r.addressClass).toBe('B');
  });
});

describe('calculateSubnet - edge cases', () => {
  it('/32 is a single host route with no network/broadcast distinction', () => {
    const r = calculateSubnet('8.8.8.8', 32);
    expect(r.networkAddress).toBe('8.8.8.8');
    expect(r.broadcastAddress).toBe('8.8.8.8');
    expect(r.firstUsableHost).toBe('8.8.8.8');
    expect(r.lastUsableHost).toBe('8.8.8.8');
    expect(r.usableHosts).toBe(1);
    expect(r.totalHosts).toBe(1);
  });

  it('/31 is a point-to-point link per RFC 3021 (both addresses usable)', () => {
    const r = calculateSubnet('192.168.1.0', 31);
    expect(r.networkAddress).toBe('192.168.1.0');
    expect(r.broadcastAddress).toBe('192.168.1.1');
    expect(r.usableHosts).toBe(2);
    expect(r.firstUsableHost).toBe('192.168.1.0');
    expect(r.lastUsableHost).toBe('192.168.1.1');
  });

  it('/0 covers the entire address space', () => {
    const r = calculateSubnet('123.45.67.89', 0);
    expect(r.networkAddress).toBe('0.0.0.0');
    expect(r.broadcastAddress).toBe('255.255.255.255');
    expect(r.totalHosts).toBe(4294967296);
    expect(r.usableHosts).toBe(4294967294);
  });

  it('throws on an invalid IP', () => {
    expect(() => calculateSubnet('999.1.1.1', 24)).toThrow();
  });

  it('throws on an out-of-range CIDR', () => {
    expect(() => calculateSubnet('1.1.1.1', 33)).toThrow();
  });
});

describe('calculateSubnet - binary and address type output', () => {
  it('produces correct binary octets', () => {
    const r = calculateSubnet('192.168.1.1', 24);
    expect(r.binary.ip.octets).toEqual(['11000000', '10101000', '00000001', '00000001']);
    expect(r.binary.mask.octets).toEqual(['11111111', '11111111', '11111111', '00000000']);
  });

  it('flags RFC 1918 private space', () => {
    expect(calculateSubnet('10.1.1.1', 8).addressTypeInfo.isPrivate).toBe(true);
    expect(calculateSubnet('172.20.1.1', 12).addressTypeInfo.isPrivate).toBe(true);
    expect(calculateSubnet('192.168.1.1', 24).addressTypeInfo.isPrivate).toBe(true);
  });

  it('flags loopback and link-local', () => {
    expect(calculateSubnet('127.0.0.1', 8).addressTypeInfo.types).toContain('loopback');
    expect(calculateSubnet('169.254.1.1', 16).addressTypeInfo.types).toContain('link-local');
  });

  it('flags a public address as public', () => {
    const r = calculateSubnet('8.8.8.8', 32);
    expect(r.addressTypeInfo.isPublic).toBe(true);
    expect(r.addressTypeInfo.isPrivate).toBe(false);
  });
});

describe('hostsToCidr - reverse lookup by host count', () => {
  it('finds the smallest block for 50 hosts', () => {
    const r = hostsToCidr(50);
    expect(r.cidr).toBe(26);
    expect(r.usableHosts).toBe(62);
  });

  it('finds a /24 for 254 hosts exactly', () => {
    const r = hostsToCidr(254);
    expect(r.cidr).toBe(24);
  });

  it('handles a single host request', () => {
    const r = hostsToCidr(1);
    expect(r.usableHosts).toBeGreaterThanOrEqual(1);
  });

  it('rejects zero or negative host counts', () => {
    expect(() => hostsToCidr(0)).toThrow();
    expect(() => hostsToCidr(-5)).toThrow();
  });
});

describe('subnetsToCidr - reverse lookup by subnet count', () => {
  it('borrows the right number of bits for 5 subnets from a /24', () => {
    const r = subnetsToCidr(24, 5);
    expect(r.borrowedBits).toBe(3);
    expect(r.newCidr).toBe(27);
    expect(r.subnetsCreated).toBe(8);
  });

  it('handles an exact power-of-two subnet count', () => {
    const r = subnetsToCidr(24, 4);
    expect(r.borrowedBits).toBe(2);
    expect(r.subnetsCreated).toBe(4);
  });

  it('throws when there are not enough host bits left', () => {
    expect(() => subnetsToCidr(31, 4)).toThrow();
  });
});
