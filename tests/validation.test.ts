import { describe, expect, it } from 'vitest';
import {
  isValidIPv4,
  isValidIPv6,
  isValidSubnetMask,
  normalizeMaskInput,
  validateIPv4Input,
  validateIPv6Input,
} from '../lib/subnet-engine/validation';

describe('isValidIPv4', () => {
  it('accepts valid addresses', () => {
    expect(isValidIPv4('192.168.1.1')).toBe(true);
    expect(isValidIPv4('0.0.0.0')).toBe(true);
    expect(isValidIPv4('255.255.255.255')).toBe(true);
  });

  it('rejects out-of-range octets', () => {
    expect(isValidIPv4('256.1.1.1')).toBe(false);
    expect(isValidIPv4('1.1.1.999')).toBe(false);
  });

  it('rejects malformed input', () => {
    expect(isValidIPv4('192.168.1')).toBe(false);
    expect(isValidIPv4('192.168.1.1.1')).toBe(false);
    expect(isValidIPv4('abc.def.gh.i')).toBe(false);
    expect(isValidIPv4('')).toBe(false);
  });

  it('rejects ambiguous leading zeros', () => {
    expect(isValidIPv4('192.168.01.1')).toBe(false);
  });
});

describe('isValidSubnetMask', () => {
  it('accepts contiguous masks', () => {
    expect(isValidSubnetMask('255.255.255.0')).toBe(true);
    expect(isValidSubnetMask('255.255.255.128')).toBe(true);
    expect(isValidSubnetMask('255.255.255.255')).toBe(true);
    expect(isValidSubnetMask('0.0.0.0')).toBe(true);
  });

  it('rejects non-contiguous masks', () => {
    expect(isValidSubnetMask('255.0.255.0')).toBe(false);
    expect(isValidSubnetMask('255.255.0.255')).toBe(false);
  });
});

describe('normalizeMaskInput', () => {
  it('accepts CIDR with or without slash', () => {
    expect(normalizeMaskInput('/24')).toBe(24);
    expect(normalizeMaskInput('24')).toBe(24);
  });

  it('accepts a dotted-decimal mask', () => {
    expect(normalizeMaskInput('255.255.255.0')).toBe(24);
  });

  it('returns null for invalid input', () => {
    expect(normalizeMaskInput('255.0.255.0')).toBeNull();
    expect(normalizeMaskInput('33')).toBeNull();
    expect(normalizeMaskInput('garbage')).toBeNull();
  });
});

describe('validateIPv4Input', () => {
  it('passes for valid ip + cidr', () => {
    expect(validateIPv4Input('192.168.1.1', '24').valid).toBe(true);
  });

  it('reports specific errors for bad ip and bad mask', () => {
    const result = validateIPv4Input('999.1.1.1', '40');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'ip')).toBe(true);
    expect(result.errors.some((e) => e.field === 'mask')).toBe(true);
  });

  it('reports missing fields', () => {
    const result = validateIPv4Input('', '');
    expect(result.errors.some((e) => e.messageKey === 'errors.ipRequired')).toBe(true);
    expect(result.errors.some((e) => e.messageKey === 'errors.maskRequired')).toBe(true);
  });
});

describe('isValidIPv6', () => {
  it('accepts full and compressed forms', () => {
    expect(isValidIPv6('2001:0db8:0000:0000:0000:0000:0000:0001')).toBe(true);
    expect(isValidIPv6('2001:db8::1')).toBe(true);
    expect(isValidIPv6('::1')).toBe(true);
    expect(isValidIPv6('::')).toBe(true);
  });

  it('accepts an IPv4-mapped tail', () => {
    expect(isValidIPv6('::ffff:192.168.1.1')).toBe(true);
  });

  it('rejects multiple "::" compressions', () => {
    expect(isValidIPv6('2001::db8::1')).toBe(false);
  });

  it('rejects malformed groups', () => {
    expect(isValidIPv6('2001:db8:zzzz::1')).toBe(false);
    expect(isValidIPv6('1:2:3:4:5:6:7:8:9')).toBe(false);
  });
});

describe('validateIPv6Input', () => {
  it('passes for valid input', () => {
    expect(validateIPv6Input('2001:db8::1', 64).valid).toBe(true);
  });

  it('flags an invalid prefix length', () => {
    expect(validateIPv6Input('2001:db8::1', 200).valid).toBe(false);
  });
});
