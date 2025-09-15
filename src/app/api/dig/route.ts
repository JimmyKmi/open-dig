import { NextRequest, NextResponse } from 'next/server';
import { execDigCommand } from '@/lib/dig-service';
import { logError } from '@/lib/log';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain, recordType = 'A', dnsServer, subnet } = body;

    if (!domain) {
      return NextResponse.json(
        { code: 'DomainRequired', message: 'Domain parameter is required' },
        { status: 400 }
      );
    }

    const result = await execDigCommand({
      domain,
      recordType,
      dnsServer,
      subnet,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logError('Dig command error:', error);
    return NextResponse.json(
      { 
        code: 'DigCommandFailed', 
        message: error.message || 'Failed to execute dig command' 
      },
      { status: 500 }
    );
  }
}
