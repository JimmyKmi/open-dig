import {exec} from 'child_process';
import {promisify} from 'util';
import {DigOptions, DigResult} from '@/types/dig';

const execAsync = promisify(exec);

// 日志辅助函数
const isDebugMode = () => process.env.DEBUG === 'true';

const logInfo = (message: string, ...args: any[]) => {
  console.log(`[OpenDig] ${message}`, ...args);
};

const logDebug = (message: string, ...args: any[]) => {
  if (isDebugMode()) {
    console.log(`[OpenDig Debug] ${message}`, ...args);
  }
};

// 启动时输出系统信息
let startupInfoLogged = false;
const logStartupInfo = () => {
  if (!startupInfoLogged) {
    const digPath = process.env.BIND_PATH || '/usr/bin/dig';
    const platform = process.platform;

    logInfo('系统信息:');
    logInfo(`  平台: ${platform}`);
    logInfo(`  dig路径: ${digPath}`);
    logInfo(`  调试模式: ${isDebugMode() ? '开启' : '关闭'}`);

    startupInfoLogged = true;
  }
};

// 解析传统 dig 文本输出
function parseDigTextOutput(output: string): any {
  const lines = output.split('\n');
  const result: any = {
    status: 'SUCCESS',
    answer: [],
    authority: [],
    additional: [],
    statistics: {},
  };

  let currentSection = 'header';
  let answerStarted = false;
  let authorityStarted = false;
  let additionalStarted = false;

  for (const line of lines) {
    const trimmedLine = line.trim();

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

    // 解析统计信息
    if (trimmedLine.includes('Query time:')) {
      const queryTimeMatch = trimmedLine.match(/Query time:\s*(.+)/);
      if (queryTimeMatch) {
        result.statistics.queryTime = queryTimeMatch[1];
      }
    }

    if (trimmedLine.includes('SERVER:')) {
      const serverMatch = trimmedLine.match(/SERVER:\s*(.+)/);
      if (serverMatch) {
        result.statistics.server = serverMatch[1];
      }
    }

    if (trimmedLine.includes('WHEN:')) {
      const whenMatch = trimmedLine.match(/WHEN:\s*(.+)/);
      if (whenMatch) {
        result.statistics.when = whenMatch[1];
      }
    }

    if (trimmedLine.includes('MSG SIZE')) {
      const msgSizeMatch = trimmedLine.match(/MSG SIZE.*:\s*(.+)/);
      if (msgSizeMatch) {
        result.statistics.msgSize = msgSizeMatch[1];
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

export async function execDigCommand(options: DigOptions): Promise<DigResult> {
  const {domain, recordType = 'A', dnsServer = '223.5.5.5'} = options;

  // 启动时输出系统信息
  logStartupInfo();

  // 从环境变量获取 dig 工具路径，默认为 'dig'
  const digPath = process.env.BIND_PATH || 'dig';

  // Windows 路径处理：确保路径被正确引用
  const quotedDigPath = digPath.includes(' ') || process.platform === 'win32'
    ? `"${digPath}"` : digPath;

  // 首先尝试使用 +json 选项
  let useJsonFormat = true;
  let command = `${quotedDigPath} +json ${domain} ${recordType} @${dnsServer}`;

  // 记录执行的命令（调试模式）
  logDebug(`执行命令: ${command}`);

  try {
    const {stdout, stderr} = await execAsync(command);

    if (stderr && stderr.includes('Invalid option: +json')) {
      // 如果不支持 +json，则使用传统格式
      useJsonFormat = false;
      command = `${quotedDigPath} ${domain}`;

      if (recordType) {
        command += ` ${recordType}`;
      }

      if (dnsServer) {
        command += ` @${dnsServer}`;
      }

      logDebug(`切换到传统格式，重新执行命令: ${command}`);

      // 重新执行命令
      const {stdout: textOutput, stderr: textStderr} = await execAsync(command);

      if (textStderr && !textStderr.includes('WARNING')) {
        throw new Error(`Dig command error: ${textStderr}`);
      }

      const parsed = parseDigTextOutput(textOutput);
      logDebug('解析结果:', parsed);

      return {
        command,
        output: textOutput,
        parsed,
      };
    }

    if (stderr && !stderr.includes('WARNING')) {
      throw new Error(`Dig command error: ${stderr}`);
    }

    // 尝试解析 JSON 输出
    let parsed;
    try {
      parsed = JSON.parse(stdout);
      logDebug('JSON解析结果:', parsed);
    } catch (parseError) {
      // 如果不是 JSON 格式，使用文本解析
      parsed = parseDigTextOutput(stdout);
      logDebug('文本解析结果:', parsed);
    }

    return {
      command,
      output: stdout,
      parsed,
    };
  } catch (error: any) {
    // 如果是 JSON 命令失败且包含 Invalid option，尝试传统格式
    if (useJsonFormat && error.message.includes('Invalid option: +json')) {
      command = `${quotedDigPath} ${domain}`;

      if (recordType) {
        command += ` ${recordType}`;
      }

      if (dnsServer) {
        command += ` @${dnsServer}`;
      }

      logDebug(`JSON模式失败，切换到传统格式: ${command}`);

      try {
        const {stdout, stderr} = await execAsync(command);

        if (stderr && !stderr.includes('WARNING')) {
          throw new Error(`Dig command error: ${stderr}`);
        }

        const parsed = parseDigTextOutput(stdout);
        logDebug('重试解析结果:', parsed);

        return {
          command,
          output: stdout,
          parsed,
        };
      } catch (retryError: any) {
        throw new Error(`Failed to execute dig command: ${retryError.message}`);
      }
    }

    throw new Error(`Failed to execute dig command: ${error.message}`);
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
    return {
      available: false,
      path: process.env.BIND_PATH || 'dig',
      error: error.message,
    };
  }
}
