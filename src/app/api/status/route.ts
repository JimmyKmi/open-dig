import { NextResponse } from 'next/server';
import { getDigInfo } from '@/lib/dig-service';
import { logError } from '@/lib/log';

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
      },
    });
  } catch (error: any) {
    logError('Status check failed:', {
      error: error.message,
      stack: error.stack
    });
    return NextResponse.json(
      {
        code: 'StatusCheckFailed',
        message: 'Failed to check system status',
      },
      { status: 500 }
    );
  }
}
