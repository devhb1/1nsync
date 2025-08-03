import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const tokenAddress = searchParams.get('tokenAddress')
    const amount = searchParams.get('amount')
    const chainId = searchParams.get('chainId') || '8453'

    if (!tokenAddress) {
        return NextResponse.json(
            { error: 'Missing required parameter: tokenAddress' },
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

        // Get approval transaction data from 1inch API
        const approveUrl = `https://api.1inch.dev/token/v1.2/${chainId}/approve/transaction`
        const approveParams = new URLSearchParams({
            tokenAddress,
            amount: amount || '115792089237316195423570985008687907853269984665640564039457584007913129639935' // Max uint256 if no amount specified
        })

        const response = await fetch(`${approveUrl}?${approveParams}`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json',
            }
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('1inch approve API error:', response.status, errorText)
            return NextResponse.json(
                { error: `1inch approve error: ${response.status} - ${errorText}` },
                { status: response.status }
            )
        }

        const approveData = await response.json()

        return NextResponse.json(approveData)

    } catch (error) {
        console.error('Error fetching approval data:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
