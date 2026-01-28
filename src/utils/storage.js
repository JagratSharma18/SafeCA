/**
 * Safe CA - Storage Utilities
 * Handles chrome.storage operations with caching and error handling
 */

import { STORAGE_KEYS, CACHE_CONFIG, DEFAULT_SETTINGS } from './constants.js';
import { getCacheKey, isCacheValid, deepClone } from './helpers.js';

/**
 * Storage wrapper for chrome.storage API
 */
class StorageManager {
  constructor() {
    this.memoryCache = new Map();
    this.initialized = false;
  }

  /**
   * Initialize storage with defaults
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      // Ensure default settings exist
      const settings = await this.get(STORAGE_KEYS.SETTINGS);
      if (!settings) {
        await this.set(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
      }
      
      // Initialize empty watchlist if needed
      const watchlist = await this.get(STORAGE_KEYS.WATCHLIST);
      if (!watchlist) {
        await this.set(STORAGE_KEYS.WATCHLIST, []);
      }
      
      // Initialize cache
      const cache = await this.get(STORAGE_KEYS.CACHE);
      if (!cache) {
        await this.set(STORAGE_KEYS.CACHE, {});
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('[SafeCA] Storage initialization error:', error);
    }
  }

  /**
   * Get a value from storage
   * @param {string} key - Storage key
   * @returns {Promise<any>}
   */
  async get(key) {
    try {
      // Check memory cache first
      if (this.memoryCache.has(key)) {
        const cached = this.memoryCache.get(key);
        if (Date.now() - cached.timestamp < 10000) { // 10 second memory cache
          return deepClone(cached.value);
        }
      }
      
      const result = await chrome.storage.local.get(key);
      const value = result[key];
      
      // Update memory cache
      this.memoryCache.set(key, {
        value: value,
        timestamp: Date.now()
      });
      
      return value;
    } catch (error) {
      console.error(`[SafeCA] Storage get error for ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a value in storage
   * @param {string} key - Storage key
   * @param {any} value - Value to store
   * @returns {Promise<boolean>}
   */
  async set(key, value) {
    try {
      await chrome.storage.local.set({ [key]: value });
      
      // Update memory cache
      this.memoryCache.set(key, {
        value: deepClone(value),
        timestamp: Date.now()
      });
      
      return true;
    } catch (error) {
      console.error(`[SafeCA] Storage set error for ${key}:`, error);
      return false;
    }
  }

  /**
   * Remove a value from storage
   * @param {string} key - Storage key
   * @returns {Promise<boolean>}
   */
  async remove(key) {
    try {
      await chrome.storage.local.remove(key);
      this.memoryCache.delete(key);
      return true;
    } catch (error) {
      console.error(`[SafeCA] Storage remove error for ${key}:`, error);
      return false;
    }
  }

  /**
   * Clear all storage
   * @returns {Promise<boolean>}
   */
  async clear() {
    try {
      await chrome.storage.local.clear();
      this.memoryCache.clear();
      return true;
    } catch (error) {
      console.error('[SafeCA] Storage clear error:', error);
      return false;
    }
  }
}

/**
 * Cache manager for token data
 */
class CacheManager {
  constructor(storage) {
    this.storage = storage;
  }

  /**
   * Get cached token data
   * @param {string} address - Contract address
   * @param {string} chain - Chain ID
   * @returns {Promise<object|null>}
   */
  async getToken(address, chain) {
    try {
      const cache = await this.storage.get(STORAGE_KEYS.CACHE) || {};
      const key = getCacheKey(address, chain);
      const entry = cache[key];
      
      if (entry && isCacheValid(entry)) {
        return entry.data;
      }
      
      return null;
    } catch (error) {
      console.error('[SafeCA] Cache get error:', error);
      return null;
    }
  }

  /**
   * Set cached token data
   * @param {string} address - Contract address
   * @param {string} chain - Chain ID
   * @param {object} data - Token data to cache
   * @returns {Promise<boolean>}
   */
  async setToken(address, chain, data) {
    try {
      const cache = await this.storage.get(STORAGE_KEYS.CACHE) || {};
      const key = getCacheKey(address, chain);
      
      cache[key] = {
        data: data,
        timestamp: Date.now()
      };
      
      // Cleanup old entries if cache is too large
      const keys = Object.keys(cache);
      if (keys.length > CACHE_CONFIG.MAX_ENTRIES) {
        await this.cleanup(cache);
      }
      
      return await this.storage.set(STORAGE_KEYS.CACHE, cache);
    } catch (error) {
      console.error('[SafeCA] Cache set error:', error);
      return false;
    }
  }

  /**
   * Remove a token from cache
   * @param {string} address - Contract address
   * @param {string} chain - Chain ID
   * @returns {Promise<boolean>}
   */
  async removeToken(address, chain) {
    try {
      const cache = await this.storage.get(STORAGE_KEYS.CACHE) || {};
      const key = getCacheKey(address, chain);
      delete cache[key];
      return await this.storage.set(STORAGE_KEYS.CACHE, cache);
    } catch (error) {
      console.error('[SafeCA] Cache remove error:', error);
      return false;
    }
  }

  /**
   * Cleanup expired cache entries
   * @param {object} cache - Cache object
   * @returns {Promise<void>}
   */
  async cleanup(cache = null) {
    try {
      if (!cache) {
        cache = await this.storage.get(STORAGE_KEYS.CACHE) || {};
      }
      
      const now = Date.now();
      const entries = Object.entries(cache);
      
      // Sort by timestamp (oldest first)
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove expired and excess entries
      const cleaned = {};
      let count = 0;
      
      for (const [key, entry] of entries.reverse()) {
        if (count < CACHE_CONFIG.MAX_ENTRIES && now - entry.timestamp < CACHE_CONFIG.TTL) {
          cleaned[key] = entry;
          count++;
        }
      }
      
      await this.storage.set(STORAGE_KEYS.CACHE, cleaned);
    } catch (error) {
      console.error('[SafeCA] Cache cleanup error:', error);
    }
  }

  /**
   * Clear all cached data
   * @returns {Promise<boolean>}
   */
  async clearAll() {
    return await this.storage.set(STORAGE_KEYS.CACHE, {});
  }
}

/**
 * Watchlist manager
 */
class WatchlistManager {
  constructor(storage) {
    this.storage = storage;
  }

  /**
   * Get all watchlist items
   * @returns {Promise<Array>}
   */
  async getAll() {
    try {
      return await this.storage.get(STORAGE_KEYS.WATCHLIST) || [];
    } catch (error) {
      console.error('[SafeCA] Watchlist get error:', error);
      return [];
    }
  }

  /**
   * Add a token to watchlist
   * @param {object} token - Token data
   * @returns {Promise<boolean>}
   */
  async add(token) {
    try {
      const watchlist = await this.getAll();
      
      // Normalize addresses for comparison
      const normalizedAddress = token.address.toLowerCase();
      
      // Check if already exists (case-insensitive)
      const exists = watchlist.some(
        item => item.address.toLowerCase() === normalizedAddress && item.chain === token.chain
      );
      
      if (exists) {
        console.log('[SafeCA] Token already in watchlist:', token.address);
        return false;
      }
      
      // Add with timestamp and baseline
      watchlist.push({
        ...token,
        address: token.address, // Keep original case
        addedAt: Date.now(),
        baseline: {
          score: token.score,
          liquidity: token.liquidity,
          holders: token.holderCount || token.holders
        }
      });
      
      return await this.storage.set(STORAGE_KEYS.WATCHLIST, watchlist);
    } catch (error) {
      console.error('[SafeCA] Watchlist add error:', error);
      return false;
    }
  }

  /**
   * Remove a token from watchlist
   * @param {string} address - Contract address
   * @param {string} chain - Chain ID
   * @returns {Promise<boolean>}
   */
  async remove(address, chain) {
    try {
      let watchlist = await this.getAll();
      const normalizedAddress = address.toLowerCase();
      watchlist = watchlist.filter(
        item => !(item.address.toLowerCase() === normalizedAddress && item.chain === chain)
      );
      return await this.storage.set(STORAGE_KEYS.WATCHLIST, watchlist);
    } catch (error) {
      console.error('[SafeCA] Watchlist remove error:', error);
      return false;
    }
  }

  /**
   * Update a watchlist item
   * @param {string} address - Contract address
   * @param {string} chain - Chain ID
   * @param {object} updates - Fields to update
   * @returns {Promise<boolean>}
   */
  async update(address, chain, updates) {
    try {
      const watchlist = await this.getAll();
      const normalizedAddress = address.toLowerCase();
      const index = watchlist.findIndex(
        item => item.address.toLowerCase() === normalizedAddress && item.chain === chain
      );
      
      if (index === -1) return false;
      
      watchlist[index] = {
        ...watchlist[index],
        ...updates,
        lastUpdated: Date.now()
      };
      
      return await this.storage.set(STORAGE_KEYS.WATCHLIST, watchlist);
    } catch (error) {
      console.error('[SafeCA] Watchlist update error:', error);
      return false;
    }
  }

  /**
   * Check if a token is in watchlist
   * @param {string} address - Contract address
   * @param {string} chain - Chain ID
   * @returns {Promise<boolean>}
   */
  async has(address, chain) {
    const watchlist = await this.getAll();
    const normalizedAddress = address.toLowerCase();
    return watchlist.some(
      item => item.address.toLowerCase() === normalizedAddress && item.chain === chain
    );
  }
}

/**
 * Settings manager
 */
class SettingsManager {
  constructor(storage) {
    this.storage = storage;
  }

  /**
   * Get all settings
   * @returns {Promise<object>}
   */
  async getAll() {
    try {
      const settings = await this.storage.get(STORAGE_KEYS.SETTINGS);
      return { ...DEFAULT_SETTINGS, ...settings };
    } catch (error) {
      console.error('[SafeCA] Settings get error:', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Get a specific setting
   * @param {string} key - Setting key
   * @returns {Promise<any>}
   */
  async get(key) {
    const settings = await this.getAll();
    return settings[key];
  }

  /**
   * Update settings
   * @param {object} updates - Settings to update
   * @returns {Promise<boolean>}
   */
  async update(updates) {
    try {
      const settings = await this.getAll();
      const newSettings = { ...settings, ...updates };
      return await this.storage.set(STORAGE_KEYS.SETTINGS, newSettings);
    } catch (error) {
      console.error('[SafeCA] Settings update error:', error);
      return false;
    }
  }

  /**
   * Reset settings to defaults
   * @returns {Promise<boolean>}
   */
  async reset() {
    return await this.storage.set(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  }
}

// Create singleton instances
const storage = new StorageManager();
const cache = new CacheManager(storage);
const watchlist = new WatchlistManager(storage);
const settings = new SettingsManager(storage);

export { storage, cache, watchlist, settings };
export default storage;
