import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const chainId = searchParams.get('chainId') || '8453'

    try {
        const apiKey = process.env.NEXT_PUBLIC_ONEINCH_API_KEY
        if (!apiKey) {
            return NextResponse.json(
                { error: '1inch API key not configured' },
                { status: 500 }
            )
        }

        // Get spender address from 1inch API
        const spenderUrl = `https://api.1inch.dev/swap/v6.0/${chainId}/approve/spender`

        const response = await fetch(spenderUrl, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json',
            }
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('1inch spender API error:', response.status, errorText)
            return NextResponse.json(
                { error: `1inch spender error: ${response.status} - ${errorText}` },
                { status: response.status }
            )
        }

        const spenderData = await response.json()
        return NextResponse.json(spenderData)

    } catch (error) {
        console.error('Spender API error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
