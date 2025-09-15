import { NextResponse } from 'next/server';
import { getDigInfo, getDefaultDnsServer } from '@/lib/dig-service';

export async function GET() {
  try {
    const digInfo = await getDigInfo();
    
    return NextResponse.json({
      success: true,
      data: {
        digAvailable: digInfo.available,
        digPath: digInfo.path,
        version: digInfo.version,
        error: digInfo.error,
        status: digInfo.available ? 'ready' : 'dig tool not found',
        platform: process.platform,
        defaultDnsServer: getDefaultDnsServer(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        code: 'StatusCheckFailed',
        message: error.message || 'Failed to check system status',
      },
      { status: 500 }
    );
  }
}
