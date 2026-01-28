/**
 * Safe CA - Token Safety Scoring
 * Calculates a 0-100 safety score based on multiple factors
 */

import { SCORE_WEIGHTS, SCORE_THRESHOLDS } from './constants.js';

/**
 * Calculate the overall safety score for a token
 * @param {object} data - Token analysis data
 * @returns {object} - Score and breakdown
 */
export function calculateSafetyScore(data) {
  const breakdown = {
    liquidityLock: calculateLiquidityScore(data),
    ownershipRenounced: calculateOwnershipScore(data),
    honeypotCheck: calculateHoneypotScore(data),
    holderDistribution: calculateHolderScore(data),
    taxRate: calculateTaxScore(data),
    contractVerified: calculateVerificationScore(data),
    tradingActivity: calculateActivityScore(data)
  };

  // Calculate weighted total
  const totalScore = Math.round(
    breakdown.liquidityLock * SCORE_WEIGHTS.LIQUIDITY_LOCK +
    breakdown.ownershipRenounced * SCORE_WEIGHTS.OWNERSHIP_RENOUNCED +
    breakdown.honeypotCheck * SCORE_WEIGHTS.HONEYPOT_CHECK +
    breakdown.holderDistribution * SCORE_WEIGHTS.HOLDER_DISTRIBUTION +
    breakdown.taxRate * SCORE_WEIGHTS.TAX_RATE +
    breakdown.contractVerified * SCORE_WEIGHTS.CONTRACT_VERIFIED +
    breakdown.tradingActivity * SCORE_WEIGHTS.TRADING_ACTIVITY
  );

  // Clamp between 0-100
  const finalScore = Math.max(0, Math.min(100, totalScore));

  return {
    score: finalScore,
    breakdown: breakdown,
    riskLevel: getRiskLevel(finalScore),
    flags: generateFlags(data, breakdown)
  };
}

/**
 * Calculate liquidity lock score (0-100)
 * Higher is better - locked/burned liquidity is safer
 */
function calculateLiquidityScore(data) {
  if (!data) return 0;
  
  let score = 50; // Base score
  
  // Check if liquidity is locked
  if (data.liquidityLocked === true) {
    score += 30;
  } else if (data.liquidityLocked === false) {
    score -= 30;
  }
  
  // Check lock duration (if available)
  if (data.lockDuration) {
    const daysLocked = data.lockDuration / (24 * 60 * 60 * 1000);
    if (daysLocked > 365) score += 20;
    else if (daysLocked > 180) score += 15;
    else if (daysLocked > 90) score += 10;
    else if (daysLocked > 30) score += 5;
  }
  
  // Check LP burned
  if (data.lpBurned === true) {
    score += 20;
  }
  
  // Check liquidity amount
  if (data.liquidity) {
    if (data.liquidity > 100000) score += 10;
    else if (data.liquidity > 50000) score += 5;
    else if (data.liquidity < 10000) score -= 10;
    else if (data.liquidity < 5000) score -= 20;
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate ownership renounced score (0-100)
 * Renounced ownership is generally safer
 */
function calculateOwnershipScore(data) {
  if (!data) return 0;
  
  let score = 50;
  
  if (data.ownershipRenounced === true) {
    score = 100;
  } else if (data.ownershipRenounced === false) {
    score = 30;
    
    // Check if owner can mint
    if (data.canMint === true) score -= 20;
    
    // Check if owner can pause
    if (data.canPause === true) score -= 10;
    
    // Check if owner can blacklist
    if (data.canBlacklist === true) score -= 15;
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate honeypot score (0-100)
 * Not being a honeypot is critical
 */
function calculateHoneypotScore(data) {
  if (!data) return 0;
  
  // Honeypot is a binary critical check
  if (data.isHoneypot === true) {
    return 0; // Immediate fail
  }
  
  if (data.isHoneypot === false) {
    let score = 100;
    
    // Check for honeypot risk indicators
    if (data.honeypotRisk === 'high') score = 30;
    else if (data.honeypotRisk === 'medium') score = 60;
    else if (data.honeypotRisk === 'low') score = 90;
    
    return score;
  }
  
  // Unknown - moderate score
  return 50;
}

/**
 * Calculate holder distribution score (0-100)
 * Better distribution = higher score
 */
function calculateHolderScore(data) {
  if (!data) return 0;
  
  let score = 50;
  
  // Top 10 holders percentage
  if (data.top10HoldersPercent !== undefined) {
    const top10 = data.top10HoldersPercent;
    if (top10 < 20) score = 100;
    else if (top10 < 30) score = 85;
    else if (top10 < 40) score = 70;
    else if (top10 < 50) score = 55;
    else if (top10 < 60) score = 40;
    else if (top10 < 70) score = 25;
    else score = 10;
  }
  
  // Top holder percentage (single wallet)
  if (data.topHolderPercent !== undefined) {
    const topHolder = data.topHolderPercent;
    if (topHolder > 50) score -= 30;
    else if (topHolder > 30) score -= 20;
    else if (topHolder > 20) score -= 10;
  }
  
  // Number of holders
  if (data.holderCount !== undefined) {
    if (data.holderCount > 10000) score += 10;
    else if (data.holderCount > 1000) score += 5;
    else if (data.holderCount < 100) score -= 15;
    else if (data.holderCount < 50) score -= 25;
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate tax rate score (0-100)
 * Lower taxes = higher score
 */
function calculateTaxScore(data) {
  if (!data) return 0;
  
  let score = 100;
  
  const buyTax = data.buyTax || 0;
  const sellTax = data.sellTax || 0;
  const totalTax = buyTax + sellTax;
  
  if (totalTax === 0) {
    score = 100;
  } else if (totalTax <= 5) {
    score = 90;
  } else if (totalTax <= 10) {
    score = 75;
  } else if (totalTax <= 15) {
    score = 60;
  } else if (totalTax <= 20) {
    score = 40;
  } else if (totalTax <= 30) {
    score = 20;
  } else {
    score = 0; // Extremely high tax
  }
  
  // Check for tax modification capability
  if (data.canModifyTax === true) {
    score -= 20;
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate contract verification score (0-100)
 */
function calculateVerificationScore(data) {
  if (!data) return 0;
  
  let score = 50;
  
  if (data.isVerified === true) {
    score = 80;
    
    // Bonus for audit
    if (data.isAudited === true) {
      score += 20;
    }
  } else if (data.isVerified === false) {
    score = 20;
  }
  
  // Check for proxy contract
  if (data.isProxy === true) {
    score -= 15;
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate trading activity score (0-100)
 */
function calculateActivityScore(data) {
  if (!data) return 0;
  
  let score = 50;
  
  // 24h volume
  if (data.volume24h !== undefined) {
    if (data.volume24h > 1000000) score += 20;
    else if (data.volume24h > 100000) score += 15;
    else if (data.volume24h > 10000) score += 10;
    else if (data.volume24h < 1000) score -= 10;
  }
  
  // Transaction count
  if (data.txCount24h !== undefined) {
    if (data.txCount24h > 1000) score += 15;
    else if (data.txCount24h > 100) score += 10;
    else if (data.txCount24h > 10) score += 5;
    else if (data.txCount24h < 5) score -= 15;
  }
  
  // Check for suspicious activity
  if (data.hasSuspiciousActivity === true) {
    score -= 30;
  }
  
  // Check for snipers
  if (data.sniperCount !== undefined && data.sniperCount > 5) {
    score -= 15;
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Get risk level from score
 * @param {number} score - Safety score (0-100)
 * @returns {string} - Risk level
 */
export function getRiskLevel(score) {
  if (score >= SCORE_THRESHOLDS.SAFE) return 'safe';
  if (score >= SCORE_THRESHOLDS.WARNING) return 'warning';
  return 'danger';
}

/**
 * Generate warning flags based on analysis
 * @param {object} data - Token data
 * @param {object} breakdown - Score breakdown
 * @returns {Array} - List of flags
 */
function generateFlags(data, breakdown) {
  const flags = [];
  
  // Critical flags (red)
  if (data.isHoneypot === true) {
    flags.push({ type: 'critical', message: 'Honeypot detected' });
  }
  
  if (data.buyTax > 20 || data.sellTax > 20) {
    flags.push({ type: 'critical', message: 'Extremely high taxes' });
  }
  
  if (data.topHolderPercent > 50) {
    flags.push({ type: 'critical', message: 'Single wallet holds >50%' });
  }
  
  // Warning flags (yellow)
  if (data.ownershipRenounced === false) {
    flags.push({ type: 'warning', message: 'Ownership not renounced' });
  }
  
  if (data.liquidityLocked === false) {
    flags.push({ type: 'warning', message: 'Liquidity not locked' });
  }
  
  if (data.canMint === true) {
    flags.push({ type: 'warning', message: 'Mintable token' });
  }
  
  if (data.canPause === true) {
    flags.push({ type: 'warning', message: 'Trading can be paused' });
  }
  
  if (data.canBlacklist === true) {
    flags.push({ type: 'warning', message: 'Blacklist function exists' });
  }
  
  if (data.isProxy === true) {
    flags.push({ type: 'warning', message: 'Proxy contract (upgradeable)' });
  }
  
  if (data.top10HoldersPercent > 50) {
    flags.push({ type: 'warning', message: 'Top 10 hold >50%' });
  }
  
  // Info flags (blue/green)
  if (data.isVerified === true) {
    flags.push({ type: 'info', message: 'Contract verified' });
  }
  
  if (data.isAudited === true) {
    flags.push({ type: 'info', message: 'Audited' });
  }
  
  if (data.lpBurned === true) {
    flags.push({ type: 'info', message: 'LP burned' });
  }
  
  if (data.ownershipRenounced === true) {
    flags.push({ type: 'info', message: 'Ownership renounced' });
  }
  
  return flags;
}

/**
 * Compare two token states and detect significant changes
 * @param {object} oldData - Previous token data
 * @param {object} newData - Current token data
 * @returns {Array} - List of changes
 */
export function detectChanges(oldData, newData) {
  const changes = [];
  
  if (!oldData || !newData) return changes;
  
  // Score change
  if (oldData.score !== undefined && newData.score !== undefined) {
    const scoreDiff = newData.score - oldData.score;
    if (Math.abs(scoreDiff) >= 15) {
      changes.push({
        type: scoreDiff < 0 ? 'critical' : 'info',
        field: 'score',
        message: `Score ${scoreDiff < 0 ? 'dropped' : 'increased'} by ${Math.abs(scoreDiff)} points`,
        oldValue: oldData.score,
        newValue: newData.score
      });
    }
  }
  
  // Liquidity change
  if (oldData.liquidity !== undefined && newData.liquidity !== undefined) {
    const liquidityChange = ((newData.liquidity - oldData.liquidity) / oldData.liquidity) * 100;
    if (liquidityChange < -10) {
      changes.push({
        type: 'critical',
        field: 'liquidity',
        message: `Liquidity dropped by ${Math.abs(liquidityChange).toFixed(1)}%`,
        oldValue: oldData.liquidity,
        newValue: newData.liquidity
      });
    }
  }
  
  // Honeypot status change
  if (oldData.isHoneypot === false && newData.isHoneypot === true) {
    changes.push({
      type: 'critical',
      field: 'honeypot',
      message: 'Token flagged as honeypot!',
      oldValue: false,
      newValue: true
    });
  }
  
  // Top holder change
  if (oldData.topHolderPercent !== undefined && newData.topHolderPercent !== undefined) {
    const holderChange = newData.topHolderPercent - oldData.topHolderPercent;
    if (holderChange > 10) {
      changes.push({
        type: 'warning',
        field: 'topHolder',
        message: `Top holder increased by ${holderChange.toFixed(1)}%`,
        oldValue: oldData.topHolderPercent,
        newValue: newData.topHolderPercent
      });
    }
  }
  
  return changes;
}

export default calculateSafetyScore;
