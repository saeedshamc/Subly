import { describe, expect, it } from 'vitest';
import { calculateVLSM } from '../lib/subnet-engine/vlsm';

describe('calculateVLSM', () => {
  it('allocates largest-to-smallest and stays aligned', () => {
    const result = calculateVLSM('192.168.1.0', 24, [
      { name: 'Sales', hostsNeeded: 60 },
      { name: 'Eng', hostsNeeded: 25 },
      { name: 'Guest', hostsNeeded: 10 },
      { name: 'PtP', hostsNeeded: 2 },
    ]);

    expect(result.fits).toBe(true);
    expect(result.allocations).toHaveLength(4);

    // Output order should match the caller's original request order.
    expect(result.allocations.map((a) => a.name)).toEqual(['Sales', 'Eng', 'Guest', 'PtP']);

    const sales = result.allocations.find((a) => a.name === 'Sales')!;
    expect(sales.cidr).toBe(26);
    expect(sales.networkAddress).toBe('192.168.1.0');
    expect(sales.usableHosts).toBe(62);

    const eng = result.allocations.find((a) => a.name === 'Eng')!;
    expect(eng.cidr).toBe(27);
    expect(eng.networkAddress).toBe('192.168.1.64');

    const guest = result.allocations.find((a) => a.name === 'Guest')!;
    expect(guest.cidr).toBe(28);
    expect(guest.networkAddress).toBe('192.168.1.96');

    const ptp = result.allocations.find((a) => a.name === 'PtP')!;
    expect(ptp.cidr).toBe(30);
    expect(ptp.networkAddress).toBe('192.168.1.112');
  });

  it('reports leftover address space', () => {
    const result = calculateVLSM('192.168.1.0', 24, [{ name: 'A', hostsNeeded: 60 }]);
    expect(result.totalAllocatedAddresses).toBe(64);
    expect(result.totalUnallocatedAddresses).toBe(256 - 64);
    // Every unallocated block should be a valid, non-overlapping CIDR block.
    const sizes = result.unallocated.map((u) => u.totalAddresses);
    expect(sizes.reduce((a, b) => a + b, 0)).toBe(256 - 64);
  });

  it('flags subnets that do not fit in the base network', () => {
    const result = calculateVLSM('192.168.1.0', 28, [{ name: 'TooBig', hostsNeeded: 100 }]);
    expect(result.fits).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.allocations).toHaveLength(0);
  });

  it('allocates what fits and reports errors for what does not', () => {
    const result = calculateVLSM('10.0.0.0', 27, [
      { name: 'Fits', hostsNeeded: 20 },
      { name: 'Overflow', hostsNeeded: 20 },
    ]);
    expect(result.allocations).toHaveLength(1);
    expect(result.allocations[0].name).toBe('Fits');
    expect(result.fits).toBe(false);
    expect(result.errors[0]).toContain('Overflow');
  });
});
