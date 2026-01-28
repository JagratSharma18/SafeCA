/**
 * Safe CA - Helper Utilities
 */

import { CA_PATTERNS, CHAIN_IDS, CACHE_CONFIG, RATE_LIMIT } from './constants.js';

/**
 * Detect if a string is a valid EVM address
 * @param {string} address - The address to check
 * @returns {boolean}
 */
export function isEVMAddress(address) {
  if (!address || typeof address !== 'string') return false;
  return /^0x[a-fA-F0-9]{40}$/.test(address.trim());
}

/**
 * Detect if a string is a valid Solana address
 * @param {string} address - The address to check
 * @returns {boolean}
 */
export function isSolanaAddress(address) {
  if (!address || typeof address !== 'string') return false;
  const trimmed = address.trim();
  // Solana addresses are base58 encoded, 32-44 chars, no 0, O, I, l
  if (trimmed.length < 32 || trimmed.length > 44) return false;
  if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(trimmed)) return false;
  
  // Additional validation: must have mix of characters (not all letters)
  const hasNumber = /[0-9]/.test(trimmed);
  const hasUpper = /[A-Z]/.test(trimmed);
  const hasLower = /[a-z]/.test(trimmed);
  
  // Real Solana addresses typically have numbers or mixed case
  if (!hasNumber && !(hasUpper && hasLower)) return false;
  
  // Reject all-letter strings (likely words)
  if (/^[A-Za-z]+$/.test(trimmed)) return false;
  
  return true;
}

/**
 * Detect the chain type from an address
 * @param {string} address - The contract address
 * @returns {string|null} - Chain ID or null if invalid
 */
export function detectChainFromAddress(address) {
  if (isEVMAddress(address)) {
    // Default to Ethereum for EVM addresses
    // User can override in manual scan
    return CHAIN_IDS.ETHEREUM;
  }
  if (isSolanaAddress(address)) {
    return CHAIN_IDS.SOLANA;
  }
  return null;
}

/**
 * Extract all contract addresses from text
 * @param {string} text - The text to scan
 * @returns {Array<{address: string, chain: string}>}
 */
export function extractContractAddresses(text) {
  if (!text || typeof text !== 'string') return [];
  
  const results = [];
  const seen = new Set();
  
  // Find EVM addresses
  const evmMatches = text.match(CA_PATTERNS.EVM) || [];
  for (const match of evmMatches) {
    const normalized = match.toLowerCase();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      results.push({
        address: match,
        chain: CHAIN_IDS.ETHEREUM,
        type: 'evm'
      });
    }
  }
  
  // Find Solana addresses
  const solanaMatches = text.match(CA_PATTERNS.SOLANA) || [];
  for (const match of solanaMatches) {
    // Filter out false positives (common words, short strings)
    if (match.length >= 32 && !seen.has(match) && isSolanaAddress(match)) {
      // Exclude common false positives
      if (!isLikelyFalsePositive(match)) {
        seen.add(match);
        results.push({
          address: match,
          chain: CHAIN_IDS.SOLANA,
          type: 'solana'
        });
      }
    }
  }
  
  return results;
}

/**
 * Check if a potential Solana address is likely a false positive
 * @param {string} str - The string to check
 * @returns {boolean}
 */
function isLikelyFalsePositive(str) {
  // Common false positives
  const falsePositives = [
    /^[A-Za-z]+$/,           // All letters (likely a word)
    /^\d+$/,                 // All numbers
    /^https?/i,              // URLs
    /^www\./i,               // URLs
    /^[A-Z][a-z]+[A-Z]/,     // CamelCase words
    /^(com|org|net|io|app|dev|xyz)$/i, // TLDs
  ];
  
  // Check if it's a common word pattern
  if (falsePositives.some(pattern => pattern.test(str))) return true;
  
  // Must have numbers or be mixed case for valid Solana address
  const hasNumber = /[0-9]/.test(str);
  const hasUpper = /[A-Z]/.test(str);
  const hasLower = /[a-z]/.test(str);
  
  if (!hasNumber && !(hasUpper && hasLower)) return true;
  
  return false;
}

/**
 * Normalize an address for consistent storage
 * @param {string} address - The address to normalize
 * @param {string} chain - The chain type
 * @returns {string}
 */
export function normalizeAddress(address, chain) {
  if (!address) return '';
  if (chain === CHAIN_IDS.SOLANA) {
    return address.trim();
  }
  // EVM addresses are case-insensitive, normalize to checksum or lowercase
  return address.toLowerCase().trim();
}

/**
 * Generate a cache key for a token
 * @param {string} address - Contract address
 * @param {string} chain - Chain ID
 * @returns {string}
 */
export function getCacheKey(address, chain) {
  return `${chain}:${normalizeAddress(address, chain)}`;
}

/**
 * Check if a cached entry is still valid
 * @param {object} entry - The cached entry
 * @returns {boolean}
 */
export function isCacheValid(entry) {
  if (!entry || !entry.timestamp) return false;
  return Date.now() - entry.timestamp < CACHE_CONFIG.TTL;
}

/**
 * Debounce a function
 * @param {Function} func - The function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function}
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle a function
 * @param {Function} func - The function to throttle
 * @param {number} limit - Time limit in ms
 * @returns {Function}
 */
export function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Sleep for a specified duration
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - The async function to retry
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<any>}
 */
export async function retryWithBackoff(fn, maxRetries = RATE_LIMIT.MAX_RETRIES) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on 4xx errors (except 429)
      if (error.status >= 400 && error.status < 500 && error.status !== 429) {
        throw error;
      }
      
      if (attempt < maxRetries) {
        const delay = RATE_LIMIT.RETRY_DELAY * Math.pow(RATE_LIMIT.BACKOFF_MULTIPLIER, attempt);
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
}

/**
 * Format a number with appropriate suffixes (K, M, B)
 * @param {number} num - The number to format
 * @returns {string}
 */
export function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return 'N/A';
  
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  
  return num.toFixed(2);
}

/**
 * Format a percentage
 * @param {number} value - The value (0-100 or 0-1)
 * @param {boolean} isDecimal - Whether the value is a decimal (0-1)
 * @returns {string}
 */
export function formatPercent(value, isDecimal = false) {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  const percent = isDecimal ? value * 100 : value;
  return percent.toFixed(2) + '%';
}

/**
 * Truncate an address for display
 * @param {string} address - The full address
 * @param {number} startChars - Characters to show at start
 * @param {number} endChars - Characters to show at end
 * @returns {string}
 */
export function truncateAddress(address, startChars = 6, endChars = 4) {
  if (!address) return '';
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Get the score color based on value
 * @param {number} score - The score (0-100)
 * @returns {string} - CSS color class or hex
 */
export function getScoreColor(score) {
  if (score === null || score === undefined || isNaN(score)) return 'gray';
  if (score >= 80) return 'green';
  if (score >= 50) return 'yellow';
  return 'red';
}

/**
 * Get the score label based on value
 * @param {number} score - The score (0-100)
 * @returns {string}
 */
export function getScoreLabel(score) {
  if (score === null || score === undefined || isNaN(score)) return 'Unknown';
  if (score >= 80) return 'Safe';
  if (score >= 50) return 'Caution';
  return 'Danger';
}

/**
 * Create a unique ID
 * @returns {string}
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Deep clone an object
 * @param {any} obj - The object to clone
 * @returns {any}
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Safely parse JSON
 * @param {string} str - The string to parse
 * @param {any} fallback - Fallback value on error
 * @returns {any}
 */
export function safeJsonParse(str, fallback = null) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

/**
 * Check if running in a browser extension context
 * @returns {boolean}
 */
export function isExtensionContext() {
  return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
}

/**
 * Get browser type
 * @returns {string} - 'chrome', 'firefox', or 'unknown'
 */
export function getBrowserType() {
  if (typeof browser !== 'undefined') return 'firefox';
  if (typeof chrome !== 'undefined') return 'chrome';
  return 'unknown';
}
