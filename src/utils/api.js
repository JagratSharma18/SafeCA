/**
 * Safe CA - API Integration
 * Fetches token data from multiple sources
 */

import { 
  API_ENDPOINTS, 
  RPC_ENDPOINTS, 
  CHAIN_IDS, 
  RATE_LIMIT 
} from './constants.js';
import { retryWithBackoff, sleep } from './helpers.js';

/**
 * Rate limiter to prevent API overload
 */
class RateLimiter {
  constructor(requestsPerMinute = RATE_LIMIT.REQUESTS_PER_MINUTE) {
    this.requestsPerMinute = requestsPerMinute;
    this.requests = [];
  }

  async acquire() {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window
    
    // Remove old requests
    this.requests = this.requests.filter(time => time > windowStart);
    
    if (this.requests.length >= this.requestsPerMinute) {
      // Wait until we can make another request
      const oldestRequest = this.requests[0];
      const waitTime = oldestRequest - windowStart + 100;
      await sleep(waitTime);
      return this.acquire();
    }
    
    this.requests.push(now);
    return true;
  }
}

const rateLimiter = new RateLimiter();

/**
 * Make a rate-limited fetch request
 * @param {string} url - URL to fetch
 * @param {object} options - Fetch options
 * @returns {Promise<any>}
 */
async function rateLimitedFetch(url, options = {}) {
  await rateLimiter.acquire();
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }
    
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fetch token security data from GoPlus Labs
 * @param {string} address - Contract address
 * @param {string} chainId - Chain ID
 * @returns {Promise<object>}
 */
export async function fetchGoPlusData(address, chainId) {
  if (chainId === CHAIN_IDS.SOLANA) {
    // GoPlus doesn't support Solana directly
    return null;
  }
  
  try {
    const url = `${API_ENDPOINTS.GOPLUS}/${chainId}?contract_addresses=${address}`;
    const data = await retryWithBackoff(() => rateLimitedFetch(url));
    
    if (data.code !== 1 || !data.result || !data.result[address.toLowerCase()]) {
      return null;
    }
    
    const result = data.result[address.toLowerCase()];
    
    return {
      isHoneypot: result.is_honeypot === '1',
      buyTax: parseFloat(result.buy_tax || 0) * 100,
      sellTax: parseFloat(result.sell_tax || 0) * 100,
      ownershipRenounced: result.owner_address === '0x0000000000000000000000000000000000000000' || 
                          result.owner_address === '' ||
                          result.can_take_back_ownership === '0',
      canMint: result.is_mintable === '1',
      canPause: result.trading_cooldown === '1' || result.can_pause_trading === '1',
      canBlacklist: result.is_blacklisted === '1' || result.is_in_dex === '0',
      isProxy: result.is_proxy === '1',
      holderCount: parseInt(result.holder_count || 0),
      lpHolderCount: parseInt(result.lp_holder_count || 0),
      top10HoldersPercent: parseFloat(result.top_10_holder_ratio || 0) * 100,
      isVerified: result.is_open_source === '1',
      creatorAddress: result.creator_address,
      ownerAddress: result.owner_address,
      tokenName: result.token_name,
      tokenSymbol: result.token_symbol,
      totalSupply: result.total_supply,
      canModifyTax: result.slippage_modifiable === '1'
    };
  } catch (error) {
    console.error('[SafeCA] GoPlus API error:', error);
    return null;
  }
}

/**
 * Fetch token data from RugCheck (Solana)
 * @param {string} address - Token address
 * @returns {Promise<object>}
 */
export async function fetchRugCheckData(address) {
  try {
    // RugCheck API endpoint format: https://api.rugcheck.xyz/v1/tokens/{address}
    const url = `${API_ENDPOINTS.RUGCHECK}/${address}`;
    const data = await retryWithBackoff(() => rateLimitedFetch(url));
    
    if (!data || data.error) {
      return null;
    }
    
    // Calculate risk level from RugCheck score
    const riskScore = data.score || 0;
    let honeypotRisk = 'unknown';
    if (riskScore >= 80) honeypotRisk = 'low';
    else if (riskScore >= 50) honeypotRisk = 'medium';
    else honeypotRisk = 'high';
    
    return {
      isHoneypot: data.risks?.some(r => r.name === 'Honeypot') || false,
      honeypotRisk: honeypotRisk,
      ownershipRenounced: data.mintAuthority === null || data.mintAuthority === '',
      liquidityLocked: data.lpLocked || false,
      lpBurned: data.lpBurned || false,
      top10HoldersPercent: data.topHoldersPercent || 0,
      topHolderPercent: data.topHolderPercent || 0,
      holderCount: data.holderCount || 0,
      liquidity: data.liquidity || 0,
      rugCheckScore: riskScore,
      risks: data.risks || [],
      tokenName: data.tokenMeta?.name,
      tokenSymbol: data.tokenMeta?.symbol
    };
  } catch (error) {
    // Only log if it's not a 404 (endpoint might not exist for some tokens)
    if (error.status !== 404) {
      console.error('[SafeCA] RugCheck API error:', error);
    }
    return null;
  }
}

/**
 * Fetch honeypot check data
 * @param {string} address - Contract address
 * @param {string} chainId - Chain ID
 * @returns {Promise<object>}
 */
export async function fetchHoneypotData(address, chainId) {
  if (chainId === CHAIN_IDS.SOLANA) {
    return null;
  }
  
  try {
    const chainMap = {
      [CHAIN_IDS.ETHEREUM]: 'eth',
      [CHAIN_IDS.BSC]: 'bsc',
      [CHAIN_IDS.POLYGON]: 'polygon',
      [CHAIN_IDS.ARBITRUM]: 'arbitrum',
      [CHAIN_IDS.BASE]: 'base',
      [CHAIN_IDS.AVALANCHE]: 'avalanche'
    };
    
    const chain = chainMap[chainId] || 'eth';
    // Honeypot.is API format: https://api.honeypot.is/v2/IsHoneypot?address={address}&chain={chain}
    const url = `${API_ENDPOINTS.HONEYPOT}?address=${address}&chain=${chain}`;
    const data = await retryWithBackoff(() => rateLimitedFetch(url));
    
    if (!data) {
      return null;
    }
    
    return {
      isHoneypot: data.honeypotResult?.isHoneypot || false,
      honeypotRisk: data.summary?.riskLevel || 'unknown',
      buyTax: data.simulationResult?.buyTax || 0,
      sellTax: data.simulationResult?.sellTax || 0,
      buyGas: data.simulationResult?.buyGas,
      sellGas: data.simulationResult?.sellGas,
      transferTax: data.simulationResult?.transferTax || 0,
      tokenName: data.token?.name,
      tokenSymbol: data.token?.symbol,
      totalSupply: data.token?.totalSupply,
      holderCount: data.token?.totalHolders
    };
  } catch (error) {
    // Only log if it's not a 404 (endpoint might not exist for some tokens)
    if (error.status !== 404) {
      console.error('[SafeCA] Honeypot API error:', error);
    }
    return null;
  }
}

/**
 * Fetch token data from DexScreener
 * @param {string} address - Token address
 * @returns {Promise<object>}
 */
export async function fetchDexScreenerData(address) {
  try {
    const url = `${API_ENDPOINTS.DEXSCREENER}/${address}`;
    const data = await retryWithBackoff(() => rateLimitedFetch(url));
    
    if (!data || !data.pairs || data.pairs.length === 0) {
      return null;
    }
    
    // Get the most liquid pair
    const pair = data.pairs.sort((a, b) => 
      (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
    )[0];
    
    return {
      tokenName: pair.baseToken?.name,
      tokenSymbol: pair.baseToken?.symbol,
      priceUsd: parseFloat(pair.priceUsd || 0),
      priceChange24h: pair.priceChange?.h24 || 0,
      volume24h: pair.volume?.h24 || 0,
      liquidity: pair.liquidity?.usd || 0,
      fdv: pair.fdv || 0,
      marketCap: pair.marketCap || 0,
      pairAddress: pair.pairAddress,
      dexId: pair.dexId,
      chainId: pair.chainId,
      txCount24h: pair.txns?.h24?.buys + pair.txns?.h24?.sells || 0,
      buys24h: pair.txns?.h24?.buys || 0,
      sells24h: pair.txns?.h24?.sells || 0,
      createdAt: pair.pairCreatedAt
    };
  } catch (error) {
    console.error('[SafeCA] DexScreener API error:', error);
    return null;
  }
}

/**
 * Fetch all available data for a token
 * @param {string} address - Contract address
 * @param {string} chainId - Chain ID
 * @returns {Promise<object>}
 */
export async function fetchAllTokenData(address, chainId) {
  const results = {
    address,
    chainId,
    timestamp: Date.now(),
    sources: {}
  };
  
  try {
    // Fetch from all sources in parallel
    const promises = [];
    
    // DexScreener (works for all chains)
    promises.push(
      fetchDexScreenerData(address)
        .then(data => { results.sources.dexScreener = data; })
        .catch(() => { results.sources.dexScreener = null; })
    );
    
    if (chainId === CHAIN_IDS.SOLANA) {
      // Solana-specific APIs
      promises.push(
        fetchRugCheckData(address)
          .then(data => { results.sources.rugCheck = data; })
          .catch(() => { results.sources.rugCheck = null; })
      );
    } else {
      // EVM-specific APIs
      promises.push(
        fetchGoPlusData(address, chainId)
          .then(data => { results.sources.goPlus = data; })
          .catch(() => { results.sources.goPlus = null; }),
        fetchHoneypotData(address, chainId)
          .then(data => { results.sources.honeypot = data; })
          .catch(() => { results.sources.honeypot = null; })
      );
    }
    
    await Promise.all(promises);
    
    // Merge data from all sources
    results.merged = mergeTokenData(results.sources, chainId);
    
    return results;
  } catch (error) {
    console.error('[SafeCA] Error fetching token data:', error);
    results.error = error.message;
    return results;
  }
}

/**
 * Merge data from multiple sources with priority
 * @param {object} sources - Data from different sources
 * @param {string} chainId - Chain ID
 * @returns {object}
 */
function mergeTokenData(sources, chainId) {
  const merged = {};
  
  // DexScreener data (market data)
  if (sources.dexScreener) {
    Object.assign(merged, {
      tokenName: sources.dexScreener.tokenName,
      tokenSymbol: sources.dexScreener.tokenSymbol,
      priceUsd: sources.dexScreener.priceUsd,
      priceChange24h: sources.dexScreener.priceChange24h,
      volume24h: sources.dexScreener.volume24h,
      liquidity: sources.dexScreener.liquidity,
      fdv: sources.dexScreener.fdv,
      marketCap: sources.dexScreener.marketCap,
      txCount24h: sources.dexScreener.txCount24h,
      buys24h: sources.dexScreener.buys24h,
      sells24h: sources.dexScreener.sells24h,
      dexId: sources.dexScreener.dexId,
      pairAddress: sources.dexScreener.pairAddress,
      createdAt: sources.dexScreener.createdAt
    });
  }
  
  if (chainId === CHAIN_IDS.SOLANA) {
    // RugCheck data (Solana security)
    if (sources.rugCheck) {
      Object.assign(merged, {
        tokenName: merged.tokenName || sources.rugCheck.tokenName,
        tokenSymbol: merged.tokenSymbol || sources.rugCheck.tokenSymbol,
        isHoneypot: sources.rugCheck.isHoneypot,
        honeypotRisk: sources.rugCheck.honeypotRisk,
        ownershipRenounced: sources.rugCheck.ownershipRenounced,
        liquidityLocked: sources.rugCheck.liquidityLocked,
        lpBurned: sources.rugCheck.lpBurned,
        top10HoldersPercent: sources.rugCheck.top10HoldersPercent,
        topHolderPercent: sources.rugCheck.topHolderPercent,
        holderCount: sources.rugCheck.holderCount || merged.holderCount,
        rugCheckScore: sources.rugCheck.rugCheckScore,
        risks: sources.rugCheck.risks
      });
    }
  } else {
    // GoPlus data (EVM security) - primary source
    if (sources.goPlus) {
      Object.assign(merged, {
        tokenName: merged.tokenName || sources.goPlus.tokenName,
        tokenSymbol: merged.tokenSymbol || sources.goPlus.tokenSymbol,
        isHoneypot: sources.goPlus.isHoneypot,
        buyTax: sources.goPlus.buyTax,
        sellTax: sources.goPlus.sellTax,
        ownershipRenounced: sources.goPlus.ownershipRenounced,
        canMint: sources.goPlus.canMint,
        canPause: sources.goPlus.canPause,
        canBlacklist: sources.goPlus.canBlacklist,
        isProxy: sources.goPlus.isProxy,
        holderCount: sources.goPlus.holderCount || merged.holderCount,
        top10HoldersPercent: sources.goPlus.top10HoldersPercent,
        isVerified: sources.goPlus.isVerified,
        canModifyTax: sources.goPlus.canModifyTax,
        creatorAddress: sources.goPlus.creatorAddress,
        ownerAddress: sources.goPlus.ownerAddress
      });
    }
    
    // Honeypot.is data (secondary/validation)
    if (sources.honeypot) {
      // Use honeypot.is as validation or fallback
      if (merged.isHoneypot === undefined) {
        merged.isHoneypot = sources.honeypot.isHoneypot;
      }
      if (merged.honeypotRisk === undefined) {
        merged.honeypotRisk = sources.honeypot.honeypotRisk;
      }
      // Use honeypot.is tax data if GoPlus didn't provide it
      if (merged.buyTax === undefined || merged.buyTax === 0) {
        merged.buyTax = sources.honeypot.buyTax;
      }
      if (merged.sellTax === undefined || merged.sellTax === 0) {
        merged.sellTax = sources.honeypot.sellTax;
      }
      if (merged.holderCount === undefined) {
        merged.holderCount = sources.honeypot.holderCount;
      }
    }
  }
  
  return merged;
}

export default fetchAllTokenData;
