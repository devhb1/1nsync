import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const chainId = searchParams.get('chainId');
        const src = searchParams.get('src');
        const dst = searchParams.get('dst');
        const amount = searchParams.get('amount');
        const includeTokensInfo = searchParams.get('includeTokensInfo');
        const includeProtocols = searchParams.get('includeProtocols');
        const includeGas = searchParams.get('includeGas');

        if (!chainId || !src || !dst || !amount) {
            return NextResponse.json(
                { error: 'Missing required parameters: chainId, src, dst, amount' },
                { status: 400 }
            );
        }

        console.log(`💱 Getting quote: ${src} → ${dst} (${amount}) on chain ${chainId}`);

        // Build query params
        const queryParams = new URLSearchParams({
            src,
            dst,
            amount,
        });

        if (includeTokensInfo) queryParams.set('includeTokensInfo', includeTokensInfo);
        if (includeProtocols) queryParams.set('includeProtocols', includeProtocols);
        if (includeGas) queryParams.set('includeGas', includeGas);

        const response = await fetch(
            `https://api.1inch.dev/swap/v6.0/${chainId}/quote?${queryParams.toString()}`,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ONEINCH_API_KEY}`,
                    'Accept': 'application/json',
                },
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ 1inch quote error:`, errorText);
            throw new Error(`1inch API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        console.log(`✅ Quote received: ${data.dstAmount || 'unknown'} output`);

        return NextResponse.json(data);
    } catch (error) {
        console.error('❌ Quote fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch quote' },
            { status: 500 }
        );
    }
}
