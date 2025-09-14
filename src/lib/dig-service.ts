import { exec } from 'child_process';
import { promisify } from 'util';
import { DigOptions, DigResult } from '@/types/dig';

const execAsync = promisify(exec);

export async function execDigCommand(options: DigOptions): Promise<DigResult> {
  const { domain, recordType = 'A', dnsServer } = options;
  
  // 从环境变量获取 dig 工具路径，默认为 'dig'
  const digPath = process.env.BIND_PATH || 'dig';
  
  // Windows 路径处理：确保路径被正确引用
  const quotedDigPath = digPath.includes(' ') || process.platform === 'win32' 
    ? `"${digPath}"` 
    : digPath;
  
  // 构建 dig 命令
  let command = `${quotedDigPath} +json ${domain}`;
  
  if (recordType) {
    command += ` ${recordType}`;
  }
  
  if (dnsServer) {
    command += ` @${dnsServer}`;
  }

  try {
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr) {
      throw new Error(`Dig command error: ${stderr}`);
    }

    // 尝试解析 JSON 输出
    let parsed;
    try {
      parsed = JSON.parse(stdout);
    } catch (parseError) {
      // 如果不是 JSON 格式，创建一个简单的解析结果
      parsed = {
        status: 'SUCCESS',
        rawOutput: stdout,
      };
    }

    return {
      command,
      output: stdout,
      parsed,
    };
  } catch (error: any) {
    throw new Error(`Failed to execute dig command: ${error.message}`);
  }
}

// 用于测试 dig 工具是否可用
export async function testDigAvailability(): Promise<boolean> {
  try {
    const digPath = process.env.BIND_PATH || 'dig';
    
    // Windows 路径处理：确保路径被正确引用
    const quotedDigPath = digPath.includes(' ') || process.platform === 'win32' 
      ? `"${digPath}"` 
      : digPath;
    
    const { stdout, stderr } = await execAsync(`${quotedDigPath} -v`);
    
    // 记录调试信息
    console.log('Dig test command:', `${quotedDigPath} -v`);
    console.log('Dig test stdout:', stdout);
    console.log('Dig test stderr:', stderr);
    
    return stdout.includes('dig') || stdout.includes('DiG');
  } catch (error: any) {
    console.error('Dig availability test failed:', error.message);
    console.error('Tested path:', process.env.BIND_PATH || 'dig');
    console.error('Platform:', process.platform);
    return false;
  }
}

// 获取 dig 工具的详细信息
export async function getDigInfo(): Promise<{
  available: boolean;
  path: string;
  version?: string;
  error?: string;
}> {
  try {
    const digPath = process.env.BIND_PATH || 'dig';
    
    // Windows 路径处理
    const quotedDigPath = digPath.includes(' ') || process.platform === 'win32' 
      ? `"${digPath}"` 
      : digPath;
    
    const { stdout, stderr } = await execAsync(`${quotedDigPath} -v`);
    
    return {
      available: true,
      path: digPath,
      version: stdout.trim(),
    };
  } catch (error: any) {
    return {
      available: false,
      path: process.env.BIND_PATH || 'dig',
      error: error.message,
    };
  }
}
