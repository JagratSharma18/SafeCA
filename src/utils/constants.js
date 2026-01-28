/**
 * Safe CA - Constants and Configuration
 */

// Chain IDs for various networks
export const CHAIN_IDS = {
  ETHEREUM: '1',
  BSC: '56',
  POLYGON: '137',
  ARBITRUM: '42161',
  BASE: '8453',
  AVALANCHE: '43114',
  SOLANA: 'solana'
};

// Chain names for display
export const CHAIN_NAMES = {
  [CHAIN_IDS.ETHEREUM]: 'Ethereum',
  [CHAIN_IDS.BSC]: 'BNB Chain',
  [CHAIN_IDS.POLYGON]: 'Polygon',
  [CHAIN_IDS.ARBITRUM]: 'Arbitrum',
  [CHAIN_IDS.BASE]: 'Base',
  [CHAIN_IDS.AVALANCHE]: 'Avalanche',
  [CHAIN_IDS.SOLANA]: 'Solana'
};

// RPC endpoints for on-chain queries
export const RPC_ENDPOINTS = {
  [CHAIN_IDS.ETHEREUM]: 'https://rpc.ankr.com/eth',
  [CHAIN_IDS.BSC]: 'https://bsc-dataseed.binance.org',
  [CHAIN_IDS.POLYGON]: 'https://polygon-rpc.com',
  [CHAIN_IDS.ARBITRUM]: 'https://arb1.arbitrum.io/rpc',
  [CHAIN_IDS.BASE]: 'https://mainnet.base.org',
  [CHAIN_IDS.AVALANCHE]: 'https://api.avax.network/ext/bc/C/rpc',
  [CHAIN_IDS.SOLANA]: 'https://api.mainnet-beta.solana.com'
};

// API endpoints
export const API_ENDPOINTS = {
  GOPLUS: 'https://api.gopluslabs.io/api/v1/token_security',
  RUGCHECK: 'https://api.rugcheck.xyz/v1/tokens',
  HONEYPOT: 'https://api.honeypot.is/v2/IsHoneypot',
  DEXSCREENER: 'https://api.dexscreener.com/latest/dex/tokens'
};

// Score thresholds
export const SCORE_THRESHOLDS = {
  SAFE: 80,      // 80-100 = Green
  WARNING: 50,   // 50-79 = Yellow
  DANGER: 0      // 0-49 = Red
};

// Score weights for calculation
export const SCORE_WEIGHTS = {
  LIQUIDITY_LOCK: 0.25,      // 25% - Liquidity locked/burned
  OWNERSHIP_RENOUNCED: 0.15, // 15% - Contract ownership renounced
  HONEYPOT_CHECK: 0.20,      // 20% - Not a honeypot
  HOLDER_DISTRIBUTION: 0.15, // 15% - Top holders < 50%
  TAX_RATE: 0.10,            // 10% - Buy/sell tax < 10%
  CONTRACT_VERIFIED: 0.10,   // 10% - Contract verified
  TRADING_ACTIVITY: 0.05     // 5% - Active trading
};

// Cache configuration
export const CACHE_CONFIG = {
  TTL: 5 * 60 * 1000,        // 5 minutes in milliseconds
  MAX_ENTRIES: 500,          // Maximum cached entries
  CLEANUP_INTERVAL: 60 * 1000 // Cleanup every minute
};

// Rate limiting
export const RATE_LIMIT = {
  REQUESTS_PER_MINUTE: 30,
  RETRY_DELAY: 1000,         // 1 second
  MAX_RETRIES: 3,
  BACKOFF_MULTIPLIER: 2
};

// Watchlist configuration
export const WATCHLIST_CONFIG = {
  POLL_INTERVAL: 5 * 60 * 1000,  // 5 minutes
  MAX_ITEMS: 50,
  ALERT_THRESHOLDS: {
    LIQUIDITY_DROP: 10,          // Alert if liquidity drops > 10%
    LARGE_SELL: 5,               // Alert if single sell > 5% supply
    HOLDER_CONCENTRATION: 20,    // Alert if top holder gains > 20%
    SCORE_DROP: 15               // Alert if score drops > 15 points
  }
};

// Regex patterns for CA detection
export const CA_PATTERNS = {
  // EVM address: 0x followed by 40 hex characters
  EVM: /\b0x[a-fA-F0-9]{40}\b/g,
  // Solana address: Base58, 32-44 characters, no 0, O, I, l
  SOLANA: /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g
};

// Badge colors
export const BADGE_COLORS = {
  SAFE: '#22c55e',      // Green
  WARNING: '#eab308',   // Yellow
  DANGER: '#ef4444',    // Red
  ERROR: '#6b7280',     // Gray
  LOADING: '#3b82f6'    // Blue
};

// UI configuration
export const UI_CONFIG = {
  BADGE_SIZE: 20,
  POPUP_WIDTH: 400,
  ANIMATION_DURATION: 200,
  DEBOUNCE_DELAY: 300,
  TOOLTIP_DELAY: 500
};

// Storage keys
export const STORAGE_KEYS = {
  CACHE: 'safeca_cache',
  WATCHLIST: 'safeca_watchlist',
  SETTINGS: 'safeca_settings',
  SCAN_HISTORY: 'safeca_history'
};

// Default allowed websites (domains where extension works)
export const DEFAULT_ALLOWED_WEBSITES = [
  'x.com',
  'twitter.com',
  'mobile.twitter.com'
];

// Default settings
export const DEFAULT_SETTINGS = {
  autoScan: true,
  showBadges: true,
  darkMode: true,
  notifications: true,
  watchlistPolling: true,
  alertThresholds: WATCHLIST_CONFIG.ALERT_THRESHOLDS,
  allowedWebsites: DEFAULT_ALLOWED_WEBSITES
};
