/**
 * Safe CA - Unit Tests for Helper Functions
 */

import {
  isEVMAddress,
  isSolanaAddress,
  detectChainFromAddress,
  extractContractAddresses,
  normalizeAddress,
  getCacheKey,
  isCacheValid,
  formatNumber,
  formatPercent,
  truncateAddress,
  getScoreColor,
  getScoreLabel,
  debounce,
  throttle,
  sleep,
  safeJsonParse,
  generateId
} from '../../src/utils/helpers.js';

import { CHAIN_IDS } from '../../src/utils/constants.js';

describe('Address Validation', () => {
  describe('isEVMAddress', () => {
    test('should return true for valid EVM addresses', () => {
      expect(isEVMAddress('0x1234567890123456789012345678901234567890')).toBe(true);
      expect(isEVMAddress('0xdead000000000000000000000000000000000000')).toBe(true);
      expect(isEVMAddress('0xABCDEF1234567890ABCDEF1234567890ABCDEF12')).toBe(true);
    });

    test('should return false for invalid EVM addresses', () => {
      expect(isEVMAddress('')).toBe(false);
      expect(isEVMAddress(null)).toBe(false);
      expect(isEVMAddress(undefined)).toBe(false);
      expect(isEVMAddress('0x123')).toBe(false); // Too short
      expect(isEVMAddress('1234567890123456789012345678901234567890')).toBe(false); // No 0x prefix
      expect(isEVMAddress('0x12345678901234567890123456789012345678901')).toBe(false); // Too long
      expect(isEVMAddress('0xGGGG567890123456789012345678901234567890')).toBe(false); // Invalid hex
    });

    test('should handle whitespace', () => {
      expect(isEVMAddress('  0x1234567890123456789012345678901234567890  ')).toBe(true);
    });
  });

  describe('isSolanaAddress', () => {
    test('should return true for valid Solana addresses', () => {
      expect(isSolanaAddress('11111111111111111111111111111111')).toBe(true); // 32 chars
      expect(isSolanaAddress('So11111111111111111111111111111111111111112')).toBe(true); // 44 chars
      expect(isSolanaAddress('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')).toBe(true); // USDC
    });

    test('should return false for invalid Solana addresses', () => {
      expect(isSolanaAddress('')).toBe(false);
      expect(isSolanaAddress(null)).toBe(false);
      expect(isSolanaAddress('abc')).toBe(false); // Too short
      expect(isSolanaAddress('1111111111111111111111111111111')).toBe(false); // 31 chars (too short)
      expect(isSolanaAddress('111111111111111111111111111111111111111111111')).toBe(false); // 45 chars (too long)
      expect(isSolanaAddress('0OIl1111111111111111111111111111')).toBe(false); // Contains invalid chars
    });
  });

  describe('detectChainFromAddress', () => {
    test('should detect EVM addresses as Ethereum', () => {
      expect(detectChainFromAddress('0x1234567890123456789012345678901234567890')).toBe(CHAIN_IDS.ETHEREUM);
    });

    test('should detect Solana addresses', () => {
      expect(detectChainFromAddress('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')).toBe(CHAIN_IDS.SOLANA);
    });

    test('should return null for invalid addresses', () => {
      expect(detectChainFromAddress('invalid')).toBe(null);
      expect(detectChainFromAddress('')).toBe(null);
    });
  });
});

describe('extractContractAddresses', () => {
  test('should extract EVM addresses from text', () => {
    const text = 'Check out this token: 0x1234567890123456789012345678901234567890';
    const result = extractContractAddresses(text);
    expect(result).toHaveLength(1);
    expect(result[0].address).toBe('0x1234567890123456789012345678901234567890');
    expect(result[0].chain).toBe(CHAIN_IDS.ETHEREUM);
    expect(result[0].type).toBe('evm');
  });

  test('should extract Solana addresses from text', () => {
    const text = 'Solana token: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    const result = extractContractAddresses(text);
    expect(result).toHaveLength(1);
    expect(result[0].chain).toBe(CHAIN_IDS.SOLANA);
    expect(result[0].type).toBe('solana');
  });

  test('should extract multiple addresses', () => {
    const text = `
      ETH: 0x1234567890123456789012345678901234567890
      SOL: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
      Another ETH: 0xABCDEF1234567890ABCDEF1234567890ABCDEF12
    `;
    const result = extractContractAddresses(text);
    expect(result).toHaveLength(3);
  });

  test('should deduplicate addresses', () => {
    const text = `
      0x1234567890123456789012345678901234567890
      0x1234567890123456789012345678901234567890
    `;
    const result = extractContractAddresses(text);
    expect(result).toHaveLength(1);
  });

  test('should handle empty or invalid input', () => {
    expect(extractContractAddresses('')).toHaveLength(0);
    expect(extractContractAddresses(null)).toHaveLength(0);
    expect(extractContractAddresses(undefined)).toHaveLength(0);
  });

  test('should filter out false positives', () => {
    const text = 'https://example.com www.test.com normalword';
    const result = extractContractAddresses(text);
    expect(result).toHaveLength(0);
  });
});

describe('Address Utilities', () => {
  describe('normalizeAddress', () => {
    test('should lowercase EVM addresses', () => {
      expect(normalizeAddress('0xABCDEF1234567890ABCDEF1234567890ABCDEF12', CHAIN_IDS.ETHEREUM))
        .toBe('0xabcdef1234567890abcdef1234567890abcdef12');
    });

    test('should preserve Solana addresses', () => {
      const solAddr = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
      expect(normalizeAddress(solAddr, CHAIN_IDS.SOLANA)).toBe(solAddr);
    });

    test('should handle empty input', () => {
      expect(normalizeAddress('', CHAIN_IDS.ETHEREUM)).toBe('');
      expect(normalizeAddress(null, CHAIN_IDS.ETHEREUM)).toBe('');
    });
  });

  describe('getCacheKey', () => {
    test('should generate correct cache keys', () => {
      expect(getCacheKey('0xABC', CHAIN_IDS.ETHEREUM)).toBe('1:0xabc');
      expect(getCacheKey('SolAddr', CHAIN_IDS.SOLANA)).toBe('solana:SolAddr');
    });
  });

  describe('truncateAddress', () => {
    test('should truncate long addresses', () => {
      const addr = '0x1234567890123456789012345678901234567890';
      expect(truncateAddress(addr)).toBe('0x1234...7890');
    });

    test('should not truncate short addresses', () => {
      expect(truncateAddress('0x1234')).toBe('0x1234');
    });

    test('should handle custom lengths', () => {
      const addr = '0x1234567890123456789012345678901234567890';
      expect(truncateAddress(addr, 10, 6)).toBe('0x12345678...567890');
    });

    test('should handle empty input', () => {
      expect(truncateAddress('')).toBe('');
      expect(truncateAddress(null)).toBe('');
    });
  });
});

describe('Cache Utilities', () => {
  describe('isCacheValid', () => {
    test('should return true for recent entries', () => {
      const entry = { timestamp: Date.now() - 1000 }; // 1 second ago
      expect(isCacheValid(entry)).toBe(true);
    });

    test('should return false for expired entries', () => {
      const entry = { timestamp: Date.now() - 10 * 60 * 1000 }; // 10 minutes ago
      expect(isCacheValid(entry)).toBe(false);
    });

    test('should return false for invalid entries', () => {
      expect(isCacheValid(null)).toBe(false);
      expect(isCacheValid({})).toBe(false);
      expect(isCacheValid({ timestamp: null })).toBe(false);
    });
  });
});

describe('Formatting Functions', () => {
  describe('formatNumber', () => {
    test('should format large numbers with suffixes', () => {
      expect(formatNumber(1000)).toBe('1.00K');
      expect(formatNumber(1500000)).toBe('1.50M');
      expect(formatNumber(2500000000)).toBe('2.50B');
    });

    test('should format small numbers', () => {
      expect(formatNumber(123.456)).toBe('123.46');
    });

    test('should handle invalid input', () => {
      expect(formatNumber(null)).toBe('N/A');
      expect(formatNumber(undefined)).toBe('N/A');
      expect(formatNumber(NaN)).toBe('N/A');
    });
  });

  describe('formatPercent', () => {
    test('should format percentages', () => {
      expect(formatPercent(50)).toBe('50.00%');
      expect(formatPercent(0.5, true)).toBe('50.00%');
    });

    test('should handle invalid input', () => {
      expect(formatPercent(null)).toBe('N/A');
      expect(formatPercent(NaN)).toBe('N/A');
    });
  });
});

describe('Score Functions', () => {
  describe('getScoreColor', () => {
    test('should return correct colors', () => {
      expect(getScoreColor(90)).toBe('green');
      expect(getScoreColor(65)).toBe('yellow');
      expect(getScoreColor(30)).toBe('red');
    });

    test('should handle edge cases', () => {
      expect(getScoreColor(80)).toBe('green');
      expect(getScoreColor(50)).toBe('yellow');
      expect(getScoreColor(49)).toBe('red');
    });

    test('should handle invalid input', () => {
      expect(getScoreColor(null)).toBe('gray');
      expect(getScoreColor(NaN)).toBe('gray');
    });
  });

  describe('getScoreLabel', () => {
    test('should return correct labels', () => {
      expect(getScoreLabel(90)).toBe('Safe');
      expect(getScoreLabel(65)).toBe('Caution');
      expect(getScoreLabel(30)).toBe('Danger');
    });

    test('should handle invalid input', () => {
      expect(getScoreLabel(null)).toBe('Unknown');
    });
  });
});

describe('Utility Functions', () => {
  describe('debounce', () => {
    jest.useFakeTimers();

    test('should debounce function calls', () => {
      const fn = jest.fn();
      const debounced = debounce(fn, 100);

      debounced();
      debounced();
      debounced();

      expect(fn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('throttle', () => {
    jest.useFakeTimers();

    test('should throttle function calls', () => {
      const fn = jest.fn();
      const throttled = throttle(fn, 100);

      throttled();
      throttled();
      throttled();

      expect(fn).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(100);
      throttled();

      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('sleep', () => {
    test('should resolve after specified time', async () => {
      const start = Date.now();
      await sleep(50);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(45);
    });
  });

  describe('safeJsonParse', () => {
    test('should parse valid JSON', () => {
      expect(safeJsonParse('{"a":1}')).toEqual({ a: 1 });
    });

    test('should return fallback for invalid JSON', () => {
      expect(safeJsonParse('invalid', 'fallback')).toBe('fallback');
      expect(safeJsonParse('invalid')).toBe(null);
    });
  });

  describe('generateId', () => {
    test('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(id1.length).toBeGreaterThan(0);
    });
  });
});
