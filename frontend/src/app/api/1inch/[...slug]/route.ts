import { NextRequest, NextResponse } from 'next/server';

const ONEINCH_BASE_URL = 'https://api.1inch.dev';
const API_KEY = process.env.NEXT_PUBLIC_ONEINCH_API_KEY;

// Debug logging
console.log('1inch API Key available:', !!API_KEY);
console.log('API Key length:', API_KEY?.length || 0);

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string[] }> }
) {
    try {
        // Await the params to comply with Next.js 15
        const resolvedParams = await params;
        const path = resolvedParams.slug.join('/');

        // Get query parameters from the original request
        const searchParams = request.nextUrl.searchParams;
        const queryString = searchParams.toString();

        // Build the full 1inch API URL
        const oneInchUrl = `${ONEINCH_BASE_URL}/${path}${queryString ? `?${queryString}` : ''}`;

        // Prepare headers
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        // Add API key with appropriate format based on endpoint
        if (API_KEY) {
            // Balance API requires Bearer prefix, Swap API doesn't, Price API uses Bearer
            if (path.startsWith('balance/') || path.startsWith('price/')) {
                headers['Authorization'] = `Bearer ${API_KEY}`;
                console.log('Using Bearer auth for balance/price API');
            } else {
                headers['Authorization'] = API_KEY;
                console.log('Using direct auth for other APIs');
            }
        } else {
            console.warn('No API key available!');
        }

        console.log('Making request to:', oneInchUrl);
        console.log('Headers:', JSON.stringify(headers, null, 2));

        // Make the request to 1inch API
        const response = await fetch(oneInchUrl, {
            method: 'GET',
            headers,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`1inch API error ${response.status}:`, errorText);
            return NextResponse.json(
                {
                    error: `1inch API error: ${response.statusText}`,
                    details: errorText,
                    status: response.status,
                    url: oneInchUrl
                },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Return the data with CORS headers
        return NextResponse.json(data, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        });

    } catch (error) {
        console.error('1inch API proxy error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string[] }> }
) {
    try {
        // Await the params to comply with Next.js 15
        const resolvedParams = await params;
        const path = resolvedParams.slug.join('/');

        // Get query parameters from the original request
        const searchParams = request.nextUrl.searchParams;
        const queryString = searchParams.toString();

        // Get request body
        const body = await request.json();

        // Build the full 1inch API URL
        const oneInchUrl = `${ONEINCH_BASE_URL}/${path}${queryString ? `?${queryString}` : ''}`;

        // Determine authentication based on endpoint
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        // Add authentication based on endpoint type
        if (path.includes('/balance/')) {
            headers.Authorization = `Bearer ${API_KEY}`;
        } else {
            headers.Authorization = API_KEY || '';
        }

        console.log(`POST Request to 1inch: ${oneInchUrl}`);

        const response = await fetch(oneInchUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`1inch API Error: ${response.status} ${response.statusText} - ${errorText}`);
            return NextResponse.json(
                { error: `1inch API Error: ${response.status} ${response.statusText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error('API Route Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
