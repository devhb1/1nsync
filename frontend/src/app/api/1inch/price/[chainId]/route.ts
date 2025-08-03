import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    { params }: { params: { chainId: string } }
) {
    try {
        const { chainId } = params;
        const { searchParams } = new URL(request.url);
        const tokens = searchParams.get('tokens');

        if (!tokens) {
            return NextResponse.json({ error: 'Tokens parameter required' }, { status: 400 });
        }

        console.log(`💰 Fetching prices for tokens on chain ${chainId}`);

        const response = await fetch(
            `https://api.1inch.dev/price/v1.1/${chainId}/${tokens}`,
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

        console.log(`✅ Got prices for ${Object.keys(data).length} tokens`);

        return NextResponse.json(data);
    } catch (error) {
        console.error('❌ Price fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch prices' },
            { status: 500 }
        );
    }
}
