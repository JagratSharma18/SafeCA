/**
 * Safe CA - Unit Tests for Scoring Functions
 */

import {
  calculateSafetyScore,
  getRiskLevel,
  detectChanges
} from '../../src/utils/scoring.js';

describe('calculateSafetyScore', () => {
  describe('Overall Score Calculation', () => {
    test('should return a score between 0 and 100', () => {
      const result = calculateSafetyScore({});
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    test('should return high score for safe token', () => {
      const safeToken = {
        liquidityLocked: true,
        lpBurned: true,
        ownershipRenounced: true,
        isHoneypot: false,
        top10HoldersPercent: 15,
        holderCount: 5000,
        buyTax: 0,
        sellTax: 0,
        isVerified: true,
        isAudited: true,
        volume24h: 500000,
        txCount24h: 500,
        liquidity: 200000
      };

      const result = calculateSafetyScore(safeToken);
      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.riskLevel).toBe('safe');
    });

    test('should return low score for dangerous token', () => {
      const dangerousToken = {
        liquidityLocked: false,
        ownershipRenounced: false,
        isHoneypot: true,
        top10HoldersPercent: 80,
        topHolderPercent: 60,
        holderCount: 20,
        buyTax: 25,
        sellTax: 25,
        isVerified: false,
        canMint: true,
        canPause: true,
        canBlacklist: true,
        volume24h: 100,
        txCount24h: 2,
        liquidity: 1000
      };

      const result = calculateSafetyScore(dangerousToken);
      expect(result.score).toBeLessThan(50);
      expect(result.riskLevel).toBe('danger');
    });

    test('should return medium score for mixed signals', () => {
      const mixedToken = {
        liquidityLocked: true,
        ownershipRenounced: false,
        isHoneypot: false,
        top10HoldersPercent: 40,
        holderCount: 500,
        buyTax: 5,
        sellTax: 5,
        isVerified: true,
        volume24h: 50000,
        txCount24h: 100
      };

      const result = calculateSafetyScore(mixedToken);
      expect(result.score).toBeGreaterThanOrEqual(50);
      expect(result.score).toBeLessThan(80);
      expect(result.riskLevel).toBe('warning');
    });
  });

  describe('Score Breakdown', () => {
    test('should include breakdown for all categories', () => {
      const result = calculateSafetyScore({});
      
      expect(result.breakdown).toBeDefined();
      expect(result.breakdown).toHaveProperty('liquidityLock');
      expect(result.breakdown).toHaveProperty('ownershipRenounced');
      expect(result.breakdown).toHaveProperty('honeypotCheck');
      expect(result.breakdown).toHaveProperty('holderDistribution');
      expect(result.breakdown).toHaveProperty('taxRate');
      expect(result.breakdown).toHaveProperty('contractVerified');
      expect(result.breakdown).toHaveProperty('tradingActivity');
    });

    test('should score liquidity correctly', () => {
      const lockedLiquidity = calculateSafetyScore({ liquidityLocked: true, liquidity: 200000 });
      const unlockedLiquidity = calculateSafetyScore({ liquidityLocked: false, liquidity: 5000 });
      
      expect(lockedLiquidity.breakdown.liquidityLock).toBeGreaterThan(unlockedLiquidity.breakdown.liquidityLock);
    });

    test('should score ownership correctly', () => {
      const renounced = calculateSafetyScore({ ownershipRenounced: true });
      const notRenounced = calculateSafetyScore({ ownershipRenounced: false, canMint: true });
      
      expect(renounced.breakdown.ownershipRenounced).toBe(100);
      expect(notRenounced.breakdown.ownershipRenounced).toBeLessThan(renounced.breakdown.ownershipRenounced);
    });

    test('should score honeypot correctly', () => {
      const notHoneypot = calculateSafetyScore({ isHoneypot: false });
      const isHoneypot = calculateSafetyScore({ isHoneypot: true });
      
      expect(notHoneypot.breakdown.honeypotCheck).toBe(100);
      expect(isHoneypot.breakdown.honeypotCheck).toBe(0);
    });

    test('should score holder distribution correctly', () => {
      const goodDistribution = calculateSafetyScore({ top10HoldersPercent: 15, holderCount: 10000 });
      const badDistribution = calculateSafetyScore({ top10HoldersPercent: 80, topHolderPercent: 60, holderCount: 30 });
      
      expect(goodDistribution.breakdown.holderDistribution).toBeGreaterThan(badDistribution.breakdown.holderDistribution);
    });

    test('should score tax rates correctly', () => {
      const noTax = calculateSafetyScore({ buyTax: 0, sellTax: 0 });
      const lowTax = calculateSafetyScore({ buyTax: 2, sellTax: 3 });
      const highTax = calculateSafetyScore({ buyTax: 20, sellTax: 20 });
      
      expect(noTax.breakdown.taxRate).toBe(100);
      expect(lowTax.breakdown.taxRate).toBeGreaterThan(highTax.breakdown.taxRate);
    });

    test('should score verification correctly', () => {
      const verified = calculateSafetyScore({ isVerified: true, isAudited: true });
      const unverified = calculateSafetyScore({ isVerified: false });
      
      expect(verified.breakdown.contractVerified).toBe(100);
      expect(unverified.breakdown.contractVerified).toBeLessThan(verified.breakdown.contractVerified);
    });

    test('should score trading activity correctly', () => {
      const active = calculateSafetyScore({ volume24h: 1000000, txCount24h: 2000 });
      const inactive = calculateSafetyScore({ volume24h: 500, txCount24h: 3 });
      
      expect(active.breakdown.tradingActivity).toBeGreaterThan(inactive.breakdown.tradingActivity);
    });
  });

  describe('Flags Generation', () => {
    test('should generate critical flags for honeypot', () => {
      const result = calculateSafetyScore({ isHoneypot: true });
      const honeypotFlag = result.flags.find(f => f.message.includes('Honeypot'));
      
      expect(honeypotFlag).toBeDefined();
      expect(honeypotFlag.type).toBe('critical');
    });

    test('should generate critical flags for high taxes', () => {
      const result = calculateSafetyScore({ buyTax: 30, sellTax: 30 });
      const taxFlag = result.flags.find(f => f.message.includes('tax'));
      
      expect(taxFlag).toBeDefined();
      expect(taxFlag.type).toBe('critical');
    });

    test('should generate warning flags for unrenounced ownership', () => {
      const result = calculateSafetyScore({ ownershipRenounced: false });
      const ownerFlag = result.flags.find(f => f.message.includes('Ownership'));
      
      expect(ownerFlag).toBeDefined();
      expect(ownerFlag.type).toBe('warning');
    });

    test('should generate info flags for positive attributes', () => {
      const result = calculateSafetyScore({ 
        isVerified: true, 
        ownershipRenounced: true,
        lpBurned: true 
      });
      
      const infoFlags = result.flags.filter(f => f.type === 'info');
      expect(infoFlags.length).toBeGreaterThan(0);
    });

    test('should include type in flags', () => {
      const result = calculateSafetyScore({ isHoneypot: true });
      result.flags.forEach(flag => {
        expect(flag.type).toBeDefined();
        expect(['critical', 'warning', 'info']).toContain(flag.type);
      });
    });
  });
});

describe('getRiskLevel', () => {
  test('should return "safe" for scores >= 80', () => {
    expect(getRiskLevel(80)).toBe('safe');
    expect(getRiskLevel(90)).toBe('safe');
    expect(getRiskLevel(100)).toBe('safe');
  });

  test('should return "warning" for scores 50-79', () => {
    expect(getRiskLevel(50)).toBe('warning');
    expect(getRiskLevel(65)).toBe('warning');
    expect(getRiskLevel(79)).toBe('warning');
  });

  test('should return "danger" for scores < 50', () => {
    expect(getRiskLevel(0)).toBe('danger');
    expect(getRiskLevel(25)).toBe('danger');
    expect(getRiskLevel(49)).toBe('danger');
  });
});

describe('detectChanges', () => {
  test('should detect score drops', () => {
    const oldData = { score: 80 };
    const newData = { score: 60 };
    
    const changes = detectChanges(oldData, newData);
    expect(changes.length).toBeGreaterThan(0);
    
    const scoreChange = changes.find(c => c.field === 'score');
    expect(scoreChange).toBeDefined();
    expect(scoreChange.type).toBe('critical');
  });

  test('should detect score increases', () => {
    const oldData = { score: 60 };
    const newData = { score: 80 };
    
    const changes = detectChanges(oldData, newData);
    const scoreChange = changes.find(c => c.field === 'score');
    
    expect(scoreChange).toBeDefined();
    expect(scoreChange.type).toBe('info');
  });

  test('should detect liquidity drops', () => {
    const oldData = { liquidity: 100000 };
    const newData = { liquidity: 80000 };
    
    const changes = detectChanges(oldData, newData);
    const liquidityChange = changes.find(c => c.field === 'liquidity');
    
    expect(liquidityChange).toBeDefined();
    expect(liquidityChange.type).toBe('critical');
  });

  test('should detect honeypot status change', () => {
    const oldData = { isHoneypot: false };
    const newData = { isHoneypot: true };
    
    const changes = detectChanges(oldData, newData);
    const honeypotChange = changes.find(c => c.field === 'honeypot');
    
    expect(honeypotChange).toBeDefined();
    expect(honeypotChange.type).toBe('critical');
  });

  test('should detect top holder concentration increase', () => {
    const oldData = { topHolderPercent: 10 };
    const newData = { topHolderPercent: 25 };
    
    const changes = detectChanges(oldData, newData);
    const holderChange = changes.find(c => c.field === 'topHolder');
    
    expect(holderChange).toBeDefined();
    expect(holderChange.type).toBe('warning');
  });

  test('should return empty array for no changes', () => {
    const oldData = { score: 80, liquidity: 100000 };
    const newData = { score: 82, liquidity: 99000 };
    
    const changes = detectChanges(oldData, newData);
    expect(changes).toHaveLength(0);
  });

  test('should handle null/undefined data', () => {
    expect(detectChanges(null, null)).toHaveLength(0);
    expect(detectChanges(undefined, {})).toHaveLength(0);
    expect(detectChanges({}, null)).toHaveLength(0);
  });
});

describe('Edge Cases', () => {
  test('should handle completely empty data', () => {
    const result = calculateSafetyScore({});
    expect(result.score).toBeDefined();
    expect(typeof result.score).toBe('number');
  });

  test('should handle null data', () => {
    const result = calculateSafetyScore(null);
    expect(result.score).toBeDefined();
  });

  test('should handle undefined data', () => {
    const result = calculateSafetyScore(undefined);
    expect(result.score).toBeDefined();
  });

  test('should handle partial data', () => {
    const result = calculateSafetyScore({ isHoneypot: false });
    expect(result.score).toBeDefined();
    expect(result.breakdown.honeypotCheck).toBe(100);
  });

  test('should clamp score to 0-100 range', () => {
    // Even with extreme values, score should be clamped
    const extremeGood = calculateSafetyScore({
      liquidityLocked: true,
      lpBurned: true,
      ownershipRenounced: true,
      isHoneypot: false,
      honeypotRisk: 'low',
      top10HoldersPercent: 5,
      holderCount: 100000,
      buyTax: 0,
      sellTax: 0,
      isVerified: true,
      isAudited: true,
      volume24h: 10000000,
      txCount24h: 10000,
      liquidity: 1000000,
      lockDuration: 400 * 24 * 60 * 60 * 1000
    });

    expect(extremeGood.score).toBeLessThanOrEqual(100);
    expect(extremeGood.score).toBeGreaterThanOrEqual(0);
  });
});
