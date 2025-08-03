import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    { params }: { params: { chainId: string; address: string } }
) {
    try {
        const { chainId, address } = params;

        console.log(`🔍 Fetching balance for ${address} on chain ${chainId}`);

        const response = await fetch(
            `https://api.1inch.dev/balance/v1.2/${chainId}/balances/${address}`,
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

        console.log(`✅ Found ${Object.keys(data).length} token balances`);

        return NextResponse.json(data);
    } catch (error) {
        console.error('❌ Balance fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch balances' },
            { status: 500 }
        );
    }
}
