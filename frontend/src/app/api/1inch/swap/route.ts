import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const chainId = searchParams.get('chainId');
        const src = searchParams.get('src');
        const dst = searchParams.get('dst');
        const amount = searchParams.get('amount');
        const from = searchParams.get('from');
        const receiver = searchParams.get('receiver');
        const slippage = searchParams.get('slippage') || '1';

        if (!chainId || !src || !dst || !amount || !from) {
            return NextResponse.json(
                { error: 'Missing required parameters: chainId, src, dst, amount, from' },
                { status: 400 }
            );
        }

        console.log(`🔄 Getting 1inch swap data: ${src} → ${dst}`);
        console.log(`   Amount: ${amount}`);
        console.log(`   From: ${from}`);
        console.log(`   Receiver: ${receiver || 'same as from'}`);
        console.log(`   Slippage: ${slippage}%`);

        // 1inch Swap API v6.0
        const url = `https://api.1inch.dev/swap/v6.0/${chainId}/swap`;

        const params = new URLSearchParams({
            src,
            dst,
            amount,
            from,
            slippage,
            disableEstimate: 'true',
            allowPartialFill: 'false',
            includeGas: 'true'
        });

        // Add receiver if provided
        if (receiver) {
            params.set('receiver', receiver);
        }

        const response = await fetch(`${url}?${params}`, {
            headers: {
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ONEINCH_API_KEY || ''}`,
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('1inch swap API error:', response.status, errorData);
            throw new Error(`1inch API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        console.log(`✅ Swap data received`);
        console.log(`   Expected output: ${data.dstAmount}`);
        console.log(`   Gas estimate: ${data.gas}`);

        return NextResponse.json(data);

    } catch (error) {
        console.error('❌ Swap API error:', error);
        return NextResponse.json(
            { error: 'Failed to get swap data', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
