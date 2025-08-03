/**
 * Multi-Chain Token Hooks
 * React hooks for managing tokens across multiple chains
 */

import { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import {
    tokenService,
    ChainTokens,
    TokenWithMetrics,
    getTop200Tokens,
    getAllChainTokens,
    searchTokens
} from '../services/tokenService'
import {
    SupportedChainId,
    SUPPORTED_CHAINS,
    isChainSupported,
    isBatchSwapperDeployed
} from '../utils/multi-chain-config'

// === TYPES ===
interface UseTokensOptions {
    chainId?: SupportedChainId
    enabled?: boolean
    refetchInterval?: number
}

interface UseTokensResult {
    tokens: TokenWithMetrics[]
    isLoading: boolean
    isError: boolean
    error: Error | null
    chainName: string
    totalTokens: number
    filteredTokens: number
    lastUpdated: string | null
    refetch: () => Promise<void>
}

interface UseAllChainsTokensResult {
    tokensByChain: Record<SupportedChainId, ChainTokens>
    isLoading: boolean
    isError: boolean
    error: Error | null
    supportedChains: SupportedChainId[]
    refetch: () => Promise<void>
}

interface UseTokenSearchResult {
    searchResults: TokenWithMetrics[]
    isSearching: boolean
    searchError: Error | null
    search: (query: string) => Promise<void>
    clearSearch: () => void
}

// === HOOKS ===

/**
 * Hook to get top 200 tokens for a specific chain
 */
export function useTokens(options: UseTokensOptions = {}): UseTokensResult {
    const { chainId: connectedChainId } = useAccount()
    const {
        chainId = (connectedChainId && isChainSupported(connectedChainId) ? connectedChainId : SUPPORTED_CHAINS.BASE),
        enabled = true,
        refetchInterval = 5 * 60 * 1000, // 5 minutes
    } = options

    const [chainTokens, setChainTokens] = useState<ChainTokens | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isError, setIsError] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const fetchTokens = useCallback(async () => {
        if (!enabled || !chainId) return

        try {
            setIsLoading(true)
            setIsError(false)
            setError(null)

            // Check cache first
            const cached = tokenService.getCachedTokens(chainId)
            if (cached) {
                setChainTokens(cached)
            }

            // Fetch fresh data
            const fresh = await getTop200Tokens(chainId)
            setChainTokens(fresh)

        } catch (err) {
            console.error(`Failed to fetch tokens for chain ${chainId}:`, err)
            setIsError(true)
            setError(err instanceof Error ? err : new Error('Failed to fetch tokens'))
        } finally {
            setIsLoading(false)
        }
    }, [chainId, enabled])

    // Initial fetch
    useEffect(() => {
        fetchTokens()
    }, [fetchTokens])

    // Periodic refetch
    useEffect(() => {
        if (!enabled || !refetchInterval) return

        const interval = setInterval(fetchTokens, refetchInterval)
        return () => clearInterval(interval)
    }, [fetchTokens, enabled, refetchInterval])

    return {
        tokens: chainTokens?.tokens || [],
        isLoading,
        isError,
        error,
        chainName: chainTokens?.chainName || '',
        totalTokens: chainTokens?.totalTokens || 0,
        filteredTokens: chainTokens?.filteredTokens || 0,
        lastUpdated: chainTokens?.lastUpdated || null,
        refetch: fetchTokens,
    }
}

/**
 * Hook to get tokens for all supported chains
 */
export function useAllChainsTokens(): UseAllChainsTokensResult {
    const [tokensByChain, setTokensByChain] = useState<Record<SupportedChainId, ChainTokens>>({} as any)
    const [isLoading, setIsLoading] = useState(false)
    const [isError, setIsError] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const fetchAllTokens = useCallback(async () => {
        try {
            setIsLoading(true)
            setIsError(false)
            setError(null)

            const results = await getAllChainTokens()
            setTokensByChain(results)

        } catch (err) {
            console.error('Failed to fetch tokens for all chains:', err)
            setIsError(true)
            setError(err instanceof Error ? err : new Error('Failed to fetch tokens'))
        } finally {
            setIsLoading(false)
        }
    }, [])

    // Initial fetch
    useEffect(() => {
        fetchAllTokens()
    }, [fetchAllTokens])

    return {
        tokensByChain,
        isLoading,
        isError,
        error,
        supportedChains: Object.values(SUPPORTED_CHAINS),
        refetch: fetchAllTokens,
    }
}

/**
 * Hook for searching tokens across all chains
 */
export function useTokenSearch(): UseTokenSearchResult {
    const [searchResults, setSearchResults] = useState<TokenWithMetrics[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [searchError, setSearchError] = useState<Error | null>(null)

    const search = useCallback(async (query: string) => {
        if (!query.trim()) {
            setSearchResults([])
            return
        }

        try {
            setIsSearching(true)
            setSearchError(null)

            const results = await searchTokens(query.trim())
            setSearchResults(results)

        } catch (err) {
            console.error('Token search failed:', err)
            setSearchError(err instanceof Error ? err : new Error('Search failed'))
            setSearchResults([])
        } finally {
            setIsSearching(false)
        }
    }, [])

    const clearSearch = useCallback(() => {
        setSearchResults([])
        setSearchError(null)
    }, [])

    return {
        searchResults,
        isSearching,
        searchError,
        search,
        clearSearch,
    }
}

/**
 * Hook to get supported tokens for the current chain with batch swapper availability
 */
export function useSupportedTokens(): UseTokensResult & { isBatchSwapperAvailable: boolean } {
    const { chainId } = useAccount()
    const supportedChainId = (chainId && isChainSupported(chainId)) ? chainId : SUPPORTED_CHAINS.BASE

    const tokensResult = useTokens({
        chainId: supportedChainId,
        enabled: true,
        refetchInterval: 5 * 60 * 1000
    })

    const isBatchSwapperAvailable = isBatchSwapperDeployed(supportedChainId)

    return {
        ...tokensResult,
        isBatchSwapperAvailable,
    }
}

/**
 * Hook to get tokens for a user's portfolio analysis
 */
export function usePortfolioTokens(userTokenAddresses: string[] = []): {
    portfolioTokens: TokenWithMetrics[]
    allAvailableTokens: TokenWithMetrics[]
    isLoading: boolean
    error: Error | null
} {
    const { chainId } = useAccount()
    const supportedChainId = (chainId && isChainSupported(chainId)) ? chainId : SUPPORTED_CHAINS.BASE

    const { tokens: allTokens, isLoading, error } = useTokens({
        chainId: supportedChainId
    })

    const portfolioTokens = allTokens.filter(token =>
        userTokenAddresses.some(addr =>
            addr.toLowerCase() === token.address.toLowerCase()
        )
    )

    return {
        portfolioTokens,
        allAvailableTokens: allTokens,
        isLoading,
        error,
    }
}
