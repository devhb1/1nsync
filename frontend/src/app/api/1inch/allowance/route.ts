import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const tokenAddress = searchParams.get('tokenAddress')
    const walletAddress = searchParams.get('walletAddress')
    const spenderAddress = searchParams.get('spenderAddress')
    const chainId = searchParams.get('chainId') || '8453'

    if (!tokenAddress || !walletAddress || !spenderAddress) {
        return NextResponse.json(
            { error: 'Missing required parameters: tokenAddress, walletAddress, spenderAddress' },
            { status: 400 }
        )
    }

    try {
        const apiKey = process.env.NEXT_PUBLIC_ONEINCH_API_KEY
        if (!apiKey) {
            return NextResponse.json(
                { error: '1inch API key not configured' },
                { status: 500 }
            )
        }

        // Try different 1inch API endpoint formats
        let allowanceResponse
        let allowanceData

        // First try: Token API with path parameters (v1.2)
        try {
            const allowanceUrl = `https://api.1inch.dev/token/v1.2/${chainId}/allowance/${tokenAddress}/${walletAddress}/${spenderAddress}`
            console.log('Trying 1inch token API v1.2:', allowanceUrl)

            allowanceResponse = await fetch(allowanceUrl, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Accept': 'application/json',
                }
            })

            if (allowanceResponse.ok) {
                allowanceData = await allowanceResponse.json()
                console.log('Success with token API v1.2:', allowanceData)
                return NextResponse.json(allowanceData)
            }
        } catch (err) {
            console.log('Token API v1.2 failed, trying alternatives')
        }

        // Second try: Portfolio API (which might have allowance info)
        try {
            const portfolioUrl = `https://api.1inch.dev/portfolio/portfolio/v4/general/erc20_allowances`
            const portfolioParams = new URLSearchParams({
                addresses: tokenAddress,
                chain_id: chainId,
                wallet_address: walletAddress,
                spender_address: spenderAddress
            })

            console.log('Trying 1inch portfolio API:', `${portfolioUrl}?${portfolioParams}`)

            allowanceResponse = await fetch(`${portfolioUrl}?${portfolioParams}`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Accept': 'application/json',
                }
            })

            if (allowanceResponse.ok) {
                allowanceData = await allowanceResponse.json()
                console.log('Success with portfolio API:', allowanceData)

                // Extract allowance from portfolio API response
                if (allowanceData && allowanceData.result && allowanceData.result.length > 0) {
                    const tokenAllowance = allowanceData.result.find((item: any) =>
                        item.token_info?.address?.toLowerCase() === tokenAddress.toLowerCase()
                    )
                    if (tokenAllowance) {
                        return NextResponse.json({
                            allowance: tokenAllowance.allowance || '0'
                        })
                    }
                }
                return NextResponse.json({ allowance: '0' })
            }
        } catch (err) {
            console.log('Portfolio API failed, falling back to direct RPC')
        }

        // Third try: Direct RPC call as fallback
        console.log('Falling back to direct RPC call')
        const rpcResponse = await fetch(`https://mainnet.base.org`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_call',
                params: [
                    {
                        to: tokenAddress,
                        data: `0xdd62ed3e${walletAddress.slice(2).padStart(64, '0')}${spenderAddress.slice(2).padStart(64, '0')}`
                    },
                    'latest'
                ],
                id: 1,
            }),
        })

        if (rpcResponse.ok) {
            const rpcData = await rpcResponse.json()
            if (rpcData.result) {
                return NextResponse.json({
                    allowance: rpcData.result,
                    source: 'rpc'
                })
            }
        }

        // If all methods fail, return error
        return NextResponse.json(
            { error: 'Unable to fetch allowance from any source' },
            { status: 500 }
        )

    } catch (error) {
        console.error('Error fetching allowance:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
