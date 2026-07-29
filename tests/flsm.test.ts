import { describe, expect, it } from 'vitest';
import { calculateFLSM } from '../lib/subnet-engine/flsm';

describe('calculateFLSM', () => {
  it('splits a /24 into 8 equal /27 subnets when 5 are requested', () => {
    const result = calculateFLSM('192.168.1.0', 24, 5);
    expect(result.fits).toBe(true);
    expect(result.newCidr).toBe(27);
    expect(result.subnetsCreated).toBe(8);
    expect(result.subnets).toHaveLength(8);
    expect(result.subnets[0].networkAddress).toBe('192.168.1.0');
    expect(result.subnets[1].networkAddress).toBe('192.168.1.32');
    expect(result.subnets[7].networkAddress).toBe('192.168.1.224');
    expect(result.subnets[7].broadcastAddress).toBe('192.168.1.255');
  });

  it('splits into exactly 4 subnets when 4 are requested', () => {
    const result = calculateFLSM('10.0.0.0', 24, 4);
    expect(result.subnetsCreated).toBe(4);
    expect(result.subnets.map((s) => s.networkAddress)).toEqual([
      '10.0.0.0',
      '10.0.0.64',
      '10.0.0.128',
      '10.0.0.192',
    ]);
  });

  it('fails gracefully when there are not enough host bits', () => {
    const result = calculateFLSM('10.0.0.0', 31, 4);
    expect(result.fits).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.subnets).toHaveLength(0);
  });

  it('indexes subnets starting from 1', () => {
    const result = calculateFLSM('172.16.0.0', 22, 2);
    expect(result.subnets[0].index).toBe(1);
    expect(result.subnets[1].index).toBe(2);
  });
});
