import {exec} from 'child_process';
import {promisify} from 'util';
import {DigOptions, DigResult} from '@/types/dig';
import {logInfo, logDebug, logStartupInfo, logError} from '@/lib/log';

const execAsync = promisify(exec);

// 解析传统 dig 文本输出
function parseDigTextOutput(output: string): any {
  const lines = output.split('\n');
  const result: any = {
    status: 'SUCCESS',
    header: {},
    answer: [],
    authority: [],
    additional: [],
    subnet: null,
  };

  let currentSection = 'header';
  let answerStarted = false;
  let authorityStarted = false;
  let additionalStarted = false;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // 解析header信息 (;; id: 49969(0xc331), opcode: QUERY, flags: QR RD RA)
    if (trimmedLine.includes('id:') && trimmedLine.includes('opcode:')) {
      const idMatch = trimmedLine.match(/id:\s*(\d+)/);
      const opcodeMatch = trimmedLine.match(/opcode:\s*(\w+)/);
      const flagsMatch = trimmedLine.match(/flags:\s*(.+)/);
      
      if (idMatch) result.header.id = parseInt(idMatch[1]);
      if (opcodeMatch) result.header.opcode = opcodeMatch[1];
      if (flagsMatch) result.header.flags = flagsMatch[1].trim();
    }

    // 解析ECS subnet信息 (;; response subnet: ECS 101.249.112.0/24 scope/24)
    if (trimmedLine.includes('response subnet:') || trimmedLine.includes('subnet:')) {
      const subnetMatch = trimmedLine.match(/ECS\s+([\d.]+\/\d+)\s+scope\/(\d+)/);
      if (subnetMatch) {
        result.subnet = {
          subnet: subnetMatch[1],
          scope: parseInt(subnetMatch[2]),
        };
      }
    }

    // 解析状态
    if (trimmedLine.includes('status:')) {
      const statusMatch = trimmedLine.match(/status:\s*(\w+)/);
      if (statusMatch) {
        result.status = statusMatch[1];
      }
    }

    // 检测各个section
    if (trimmedLine.includes(';; ANSWER SECTION:')) {
      currentSection = 'answer';
      answerStarted = true;
      continue;
    } else if (trimmedLine.includes(';; AUTHORITY SECTION:')) {
      currentSection = 'authority';
      authorityStarted = true;
      continue;
    } else if (trimmedLine.includes(';; ADDITIONAL SECTION:')) {
      currentSection = 'additional';
      additionalStarted = true;
      continue;
    }

    // 解析答案记录
    if (currentSection === 'answer' && answerStarted && trimmedLine && !trimmedLine.startsWith(';')) {
      const parts = trimmedLine.split(/\s+/);
      if (parts.length >= 5) {
        const record = {
          name: parts[0],
          ttl: parseInt(parts[1]) || 0,
          class: parts[2],
          type: parts[3],
          rdata: parts.slice(4).join(' '),
        };
        result.answer.push(record);
      }
    }

    // 解析权威记录
    if (currentSection === 'authority' && authorityStarted && trimmedLine && !trimmedLine.startsWith(';')) {
      const parts = trimmedLine.split(/\s+/);
      if (parts.length >= 5) {
        const record = {
          name: parts[0],
          ttl: parseInt(parts[1]) || 0,
          class: parts[2],
          type: parts[3],
          rdata: parts.slice(4).join(' '),
        };
        result.authority.push(record);
      }
    }

    // 解析额外记录
    if (currentSection === 'additional' && additionalStarted && trimmedLine && !trimmedLine.startsWith(';')) {
      const parts = trimmedLine.split(/\s+/);
      if (parts.length >= 5) {
        const record = {
          name: parts[0],
          ttl: parseInt(parts[1]) || 0,
          class: parts[2],
          type: parts[3],
          rdata: parts.slice(4).join(' '),
        };
        result.additional.push(record);
      }
    }

  }

  // 如果没有找到答案，但状态是成功的，可能是NXDOMAIN等情况
  if (result.answer.length === 0 && result.status === 'SUCCESS') {
    if (output.includes('NXDOMAIN')) {
      result.status = 'NXDOMAIN';
    } else if (output.includes('SERVFAIL')) {
      result.status = 'SERVFAIL';
    }
  }

  return result;
}

// 格式化解析后的dig结果为标准输出格式
function formatDigOutput(parsed: any, originalQuery?: string): string {
  let output = '';
  
  // 添加查询命令注释行
  if (originalQuery) {
    output += `; ${originalQuery}\n`;
  }
  
  // 添加header信息
  if (parsed.header && (parsed.header.id !== undefined || parsed.header.opcode || parsed.header.flags)) {
    output += `;; id: ${parsed.header.id || 0}`;
    if (parsed.header.id) {
      output += `(0x${parsed.header.id.toString(16)})`;
    }
    if (parsed.header.opcode) {
      output += `, opcode: ${parsed.header.opcode}`;
    }
    if (parsed.header.flags) {
      output += `, flags: ${parsed.header.flags}`;
    }
    output += '\n';
  }
  
  // 添加subnet信息
  if (parsed.subnet) {
    output += `;; response subnet: ECS ${parsed.subnet.subnet} scope/${parsed.subnet.scope}\n`;
  }
  
  output += '\n';
  
  // 添加ANSWER SECTION
  if (parsed.answer && parsed.answer.length > 0) {
    output += `;; ANSWER SECTION:\n`;
    for (const record of parsed.answer) {
      output += `${record.name} ${record.ttl} ${record.class} ${record.type} ${record.rdata}\n`;
    }
    output += '\n';
  }
  
  // 添加AUTHORITY SECTION
  if (parsed.authority && parsed.authority.length > 0) {
    output += `;; AUTHORITY SECTION:\n`;
    for (const record of parsed.authority) {
      output += `${record.name} ${record.ttl} ${record.class} ${record.type} ${record.rdata}\n`;
    }
    output += '\n';
  }
  
  // 添加ADDITIONAL SECTION
  if (parsed.additional && parsed.additional.length > 0) {
    output += `;; ADDITIONAL SECTION:\n`;
    for (const record of parsed.additional) {
      output += `${record.name} ${record.ttl} ${record.class} ${record.type} ${record.rdata}\n`;
    }
    output += '\n';
  }
  
  // 移除统计信息输出部分
  
  return output.trim();
}

// 获取默认DNS服务器
export function getDefaultDnsServer(): string {
  return process.env.DEFAULT_DNS || '223.5.5.5';
}

export async function execDigCommand(options: DigOptions): Promise<DigResult> {
  const {domain, recordType = 'A', subnet} = options;
  const dnsServer = getDefaultDnsServer();

  // 启动时输出系统信息
  logStartupInfo();

  // 从环境变量获取 dig 工具路径，默认为 'dig'
  const digPath = process.env.BIND_PATH || 'dig';

  // Windows 路径处理：确保路径被正确引用
  const quotedDigPath = digPath.includes(' ') || process.platform === 'win32'
    ? `"${digPath}"` : digPath;

  // 构建dig命令
  let command = `${quotedDigPath} ${domain} ${recordType} +timeout=3`;
  if (subnet) {
    command += ` +subnet=${subnet}`;
  }
  command += ` @${dnsServer}`;
  console.log('execDigCommand', command);

  // 记录执行的命令（调试模式）
  logDebug(`执行命令: ${command}`);

  try {
    const {stdout, stderr} = await execAsync(command);

    if (stderr && !stderr.includes('WARNING')) {
      logError('Dig command stderr:', stderr);
      throw new Error('Dig command execution failed');
    }

    const parsed = parseDigTextOutput(stdout);
    logDebug('解析结果:', parsed);

    // 构建原始查询字符串用于格式化输出
    let originalQuery = `dig ${domain} ${recordType}`;
    if (subnet) {
      originalQuery += ` +subnet=${subnet}`;
    }
    originalQuery += ` @${dnsServer}`;
    
    // 使用解析后的数据重新格式化输出
    const formattedOutput = formatDigOutput(parsed, originalQuery);

    return {
      output: formattedOutput,
      parsed,
    };
  } catch (error: any) {
    logError('Dig command execution failed:', {
      command,
      domain,
      recordType,
      subnet,
      error: error.message,
      stack: error.stack
    });
    throw new Error('Failed to execute dig command');
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

    const {stdout, stderr} = await execAsync(`${quotedDigPath} -v`);

    return {
      available: true,
      path: digPath,
      version: stdout.trim(),
    };
  } catch (error: any) {
    logError('Dig tool check failed:', {
      path: process.env.BIND_PATH || 'dig',
      error: error.message,
      stack: error.stack
    });
    return {
      available: false,
      path: process.env.BIND_PATH || 'dig',
      error: 'Dig tool not available',
    };
  }
}
