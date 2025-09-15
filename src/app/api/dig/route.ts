import { NextRequest, NextResponse } from 'next/server';
import { execDigCommand } from '@/lib/dig-service';
import { logError } from '@/lib/log';
import { subnetMap, SubnetInfo } from '@/lib/dig-map';
import { validateApiParams } from '@/lib/validation';

export async function POST(request: NextRequest) {
  let requestBody: any = {};
  try {
    const body = await request.json();
    const { domain, recordType = 'A', subnet } = body;
    requestBody = { domain, recordType, subnet };

    // 验证请求参数
    const validation = validateApiParams({ domain, recordType, subnet });
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          code: 'InvalidParameters', 
          message: '参数验证失败',
          errors: validation.errors
        },
        { status: 400 }
      );
    }

    // 如果指定了subnet，执行单个查询
    if (subnet) {
      const result = await execDigCommand({
        domain,
        recordType,
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
            subnet: subnetInfo.subnet,
          });
          return {
            subnetInfo,
            result,
            success: true,
          };
        } catch (error: any) {
          logError('Subnet query failed:', {
            subnet: subnetInfo.subnet,
            domain,
            recordType,
            error: error.message,
            stack: error.stack
          });
          return {
            subnetInfo,
            error: 'Query failed',
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
    logError('API request failed:', {
      body: requestBody,
      error: error.message,
      stack: error.stack
    });
    
    // 根据错误类型返回不同的错误码
    if (error.message.includes('validation') || error.message.includes('参数')) {
      return NextResponse.json(
        { 
          code: 'InvalidParameters', 
          message: '参数验证失败' 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        code: 'DigCommandFailed', 
        message: 'Failed to execute dig command' 
      },
      { status: 500 }
    );
  }
}
