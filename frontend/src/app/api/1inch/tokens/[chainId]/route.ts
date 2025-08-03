import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    { params }: { params: { chainId: string } }
) {
    try {
        const { chainId } = params;

        console.log(`🪙 Fetching tokens for chain ${chainId}`);

        const response = await fetch(
            `https://api.1inch.dev/token/v1.2/${chainId}/token-list`,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ONEINCH_API_KEY}`,
                    'Accept': 'application/json',
                },
            }
        );

        if (!response.ok) {
            throw new Error(`1inch API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        console.log(`✅ Found ${Object.keys(data.tokens || {}).length} tokens`);

        return NextResponse.json(data);
    } catch (error) {
        console.error('❌ Tokens fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch tokens' },
            { status: 500 }
        );
    }
}
