import { NextRequest, NextResponse } from 'next/server';
import { execDigCommand } from '@/lib/dig-service';
import { logError } from '@/lib/log';
import { subnetMap, SubnetInfo } from '@/lib/dig-map';

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

    // 如果指定了subnet，执行单个查询
    if (subnet) {
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
    }

    // 如果没有指定subnet，查询所有subnetMap中的子网
    const results = await Promise.allSettled(
      subnetMap.map(async (subnetInfo: SubnetInfo) => {
        try {
          const result = await execDigCommand({
            domain,
            recordType,
            dnsServer,
            subnet: subnetInfo.subnet,
          });
          return {
            subnetInfo,
            result,
            success: true,
          };
        } catch (error: any) {
          return {
            subnetInfo,
            error: error.message,
            success: false,
          };
        }
      })
    );

    // 处理结果
    const successfulResults = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value.success)
      .map(r => r.value);

    const failedResults = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && !r.value.success)
      .map(r => r.value);

    return NextResponse.json({
      success: true,
      data: {
        successfulResults,
        failedResults,
        totalQueries: subnetMap.length,
        successCount: successfulResults.length,
        failureCount: failedResults.length,
      },
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
