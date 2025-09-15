import { exec } from 'child_process'
import { promisify } from 'util'
import { DigOptions, DigResult } from '@/types/dig'
import { logDebug, logStartupInfo, logError } from '@/lib/log'

const execAsync = promisify(exec)

// 解析传统 dig 文本输出
function parseDigTextOutput(output: string): {
  status: string
  header: Record<string, unknown>
  answer: Array<{
    name: string
    ttl: number
    class: string
    type: string
    rdata: string
    rdlength: number
  }>
  authority: Array<{
    name: string
    ttl: number
    class: string
    type: string
    rdata: string
    rdlength: number
  }>
  additional: Array<{
    name: string
    ttl: number
    class: string
    type: string
    rdata: string
    rdlength: number
  }>
  subnet: {
    subnet: string
    scope: number
  } | null
  lastCname: string | null
} {
  const lines = output.split('\n')
  const result: {
    status: string
    header: Record<string, unknown>
    answer: Array<{
      name: string
      ttl: number
      class: string
      type: string
      rdata: string
    }>
    authority: Array<{
      name: string
      ttl: number
      class: string
      type: string
      rdata: string
    }>
    additional: Array<{
      name: string
      ttl: number
      class: string
      type: string
      rdata: string
    }>
    subnet: {
      subnet: string
      scope: number
    } | null
    lastCname: string | null
  } = {
    status: 'SUCCESS',
    header: {},
    answer: [],
    authority: [],
    additional: [],
    subnet: null,
    lastCname: null // 最后一跳cname
  }

  let currentSection = 'header'
  let answerStarted = false
  let authorityStarted = false
  let additionalStarted = false

  for (const line of lines) {
    const trimmedLine = line.trim()

    // 解析header信息 (;; id: 49969(0xc331), opcode: QUERY, flags: QR RD RA)
    if (trimmedLine.includes('id:') && trimmedLine.includes('opcode:')) {
      const idMatch = trimmedLine.match(/id:\s*(\d+)/)
      const opcodeMatch = trimmedLine.match(/opcode:\s*(\w+)/)
      const flagsMatch = trimmedLine.match(/flags:\s*(.+)/)

      if (idMatch) result.header.id = parseInt(idMatch[1])
      if (opcodeMatch) result.header.opcode = opcodeMatch[1]
      if (flagsMatch) result.header.flags = flagsMatch[1].trim()
    }

    // 解析ECS subnet信息 (;; response subnet: ECS 101.249.112.0/24 scope/24)
    if (trimmedLine.includes('response subnet:') || trimmedLine.includes('subnet:')) {
      const subnetMatch = trimmedLine.match(/ECS\s+([\d.]+\/\d+)\s+scope\/(\d+)/)
      if (subnetMatch) {
        result.subnet = {
          subnet: subnetMatch[1],
          scope: parseInt(subnetMatch[2])
        }
      }
    }

    // 解析状态
    if (trimmedLine.includes('status:')) {
      const statusMatch = trimmedLine.match(/status:\s*(\w+)/)
      if (statusMatch) {
        result.status = statusMatch[1]
      }
    }

    // 检测各个section
    if (trimmedLine.includes(';; ANSWER SECTION:')) {
      currentSection = 'answer'
      answerStarted = true
      continue
    } else if (trimmedLine.includes(';; AUTHORITY SECTION:')) {
      currentSection = 'authority'
      authorityStarted = true
      continue
    } else if (trimmedLine.includes(';; ADDITIONAL SECTION:')) {
      currentSection = 'additional'
      additionalStarted = true
      continue
    }

    // 解析答案记录
    if (currentSection === 'answer' && answerStarted && trimmedLine && !trimmedLine.startsWith(';')) {
      const parts = trimmedLine.split(/\s+/)
      if (parts.length >= 5) {
        const record = {
          name: parts[0],
          ttl: parseInt(parts[1]) || 0,
          class: parts[2],
          type: parts[3],
          rdata: parts.slice(4).join(' '),
          rdlength: parts.slice(4).join(' ').length
        }
        result.answer.push(record)

        // 跟踪最后一跳cname
        if (record.type === 'CNAME') {
          result.lastCname = record.rdata
        }
      }
    }

    // 解析权威记录
    if (currentSection === 'authority' && authorityStarted && trimmedLine && !trimmedLine.startsWith(';')) {
      const parts = trimmedLine.split(/\s+/)
      if (parts.length >= 5) {
        const record = {
          name: parts[0],
          ttl: parseInt(parts[1]) || 0,
          class: parts[2],
          type: parts[3],
          rdata: parts.slice(4).join(' '),
          rdlength: parts.slice(4).join(' ').length
        }
        result.authority.push(record)
      }
    }

    // 解析额外记录
    if (currentSection === 'additional' && additionalStarted && trimmedLine && !trimmedLine.startsWith(';')) {
      const parts = trimmedLine.split(/\s+/)
      if (parts.length >= 5) {
        const record = {
          name: parts[0],
          ttl: parseInt(parts[1]) || 0,
          class: parts[2],
          type: parts[3],
          rdata: parts.slice(4).join(' '),
          rdlength: parts.slice(4).join(' ').length
        }
        result.additional.push(record)
      }
    }
  }

  // 如果没有找到答案，但状态是成功的，可能是NXDOMAIN等情况
  if (result.answer.length === 0 && result.status === 'SUCCESS') {
    if (output.includes('NXDOMAIN')) {
      result.status = 'NXDOMAIN'
    } else if (output.includes('SERVFAIL')) {
      result.status = 'SERVFAIL'
    }
  }

  return result as {
    status: string
    header: Record<string, unknown>
    answer: Array<{
      name: string
      ttl: number
      class: string
      type: string
      rdata: string
      rdlength: number
    }>
    authority: Array<{
      name: string
      ttl: number
      class: string
      type: string
      rdata: string
      rdlength: number
    }>
    additional: Array<{
      name: string
      ttl: number
      class: string
      type: string
      rdata: string
      rdlength: number
    }>
    subnet: {
      subnet: string
      scope: number
    } | null
    lastCname: string | null
  }
}

// 格式化解析后的dig结果为标准输出格式
function formatDigOutput(
  parsed: {
    status: string
    header: Record<string, unknown>
    answer: Array<{
      name: string
      ttl: number
      class: string
      type: string
      rdata: string
      rdlength: number
    }>
    authority: Array<{
      name: string
      ttl: number
      class: string
      type: string
      rdata: string
      rdlength: number
    }>
    additional: Array<{
      name: string
      ttl: number
      class: string
      type: string
      rdata: string
      rdlength: number
    }>
    subnet: {
      subnet: string
      scope: number
    } | null
    lastCname: string | null
  },
  originalQuery?: string
): string {
  let output = ''

  // 添加查询命令注释行
  if (originalQuery) {
    output += `; ${originalQuery}\n`
  }

  // 添加header信息
  if (parsed.header && (parsed.header.id !== undefined || parsed.header.opcode || parsed.header.flags)) {
    output += `;; id: ${parsed.header.id || 0}`
    if (parsed.header.id) {
      output += `(0x${Number(parsed.header.id).toString(16)})`
    }
    if (parsed.header.opcode) {
      output += `, opcode: ${parsed.header.opcode}`
    }
    if (parsed.header.flags) {
      output += `, flags: ${parsed.header.flags}`
    }
    output += '\n'
  }

  // 添加subnet信息
  if (parsed.subnet) {
    output += `;; response subnet: ECS ${parsed.subnet.subnet} scope/${parsed.subnet.scope}\n`
  }

  output += '\n'

  // 添加ANSWER SECTION
  if (parsed.answer && parsed.answer.length > 0) {
    output += `;; ANSWER SECTION:\n`
    for (const record of parsed.answer) {
      output += `${record.name} ${record.ttl} ${record.class} ${record.type} ${record.rdata}\n`
    }
    output += '\n'
  }

  // 添加AUTHORITY SECTION
  if (parsed.authority && parsed.authority.length > 0) {
    output += `;; AUTHORITY SECTION:\n`
    for (const record of parsed.authority) {
      output += `${record.name} ${record.ttl} ${record.class} ${record.type} ${record.rdata}\n`
    }
    output += '\n'
  }

  // 添加ADDITIONAL SECTION
  if (parsed.additional && parsed.additional.length > 0) {
    output += `;; ADDITIONAL SECTION:\n`
    for (const record of parsed.additional) {
      output += `${record.name} ${record.ttl} ${record.class} ${record.type} ${record.rdata}\n`
    }
    output += '\n'
  }

  // 移除统计信息输出部分

  return output.trim()
}

// 获取默认DNS服务器
export function getDefaultDnsServer(): string {
  return process.env.DEFAULT_DNS || '223.5.5.5'
}

export async function execDigCommand(options: DigOptions): Promise<DigResult> {
  const { domain, recordType = 'A', subnet } = options
  const dnsServer = getDefaultDnsServer()

  // 启动时输出系统信息
  logStartupInfo()

  // 从环境变量获取 dig 工具路径，默认为 'dig'
  const digPath = process.env.BIND_PATH || 'dig'

  // Windows 路径处理：确保路径被正确引用
  const quotedDigPath = digPath.includes(' ') || process.platform === 'win32' ? `"${digPath}"` : digPath

  // 构建dig命令
  let command = `${quotedDigPath} ${domain} ${recordType} +timeout=3`
  if (subnet) {
    command += ` +subnet=${subnet}`
  }
  command += ` @${dnsServer}`

  // 记录执行的命令（调试模式）
  logDebug(`run: ${command}`)

  try {
    const { stdout } = await execAsync(command)

    // 注意：stderr 变量已移除，因为未使用

    const parsed = parseDigTextOutput(stdout)
    logDebug('解析结果:', parsed)

    // 构建原始查询字符串用于格式化输出
    let originalQuery = `dig ${domain} ${recordType}`
    if (subnet) {
      originalQuery += ` +subnet=${subnet}`
    }
    originalQuery += ` @${dnsServer}`

    // 使用解析后的数据重新格式化输出
    const formattedOutput = formatDigOutput(parsed, originalQuery)

    // 修复 lastCname 类型不兼容（string | null -> string | undefined），并保留 class 字段类型转换
    return {
      output: formattedOutput,
      parsed: {
        ...parsed,
        answer:
          parsed.answer?.map((item) => ({
            ...item,
            class: Number(item.class)
          })) ?? [],
        authority:
          parsed.authority?.map((item) => ({
            ...item,
            class: Number(item.class)
          })) ?? [],
        additional:
          parsed.additional?.map((item) => ({
            ...item,
            class: Number(item.class)
          })) ?? [],
        lastCname: parsed.lastCname === null ? undefined : parsed.lastCname
      }
    }
  } catch (error: unknown) {
    logError('Dig command execution failed:', {
      command,
      domain,
      recordType,
      subnet,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    throw new Error('Failed to execute dig command')
  }
}

// 获取 dig 工具的详细信息
export async function getDigInfo(): Promise<{
  available: boolean
  path: string
  version?: string
  error?: string
}> {
  try {
    const digPath = process.env.BIND_PATH || 'dig'

    // Windows 路径处理
    const quotedDigPath = digPath.includes(' ') || process.platform === 'win32' ? `"${digPath}"` : digPath

    const { stdout } = await execAsync(`${quotedDigPath} -v`)

    return {
      available: true,
      path: digPath,
      version: stdout.trim()
    }
  } catch (error: unknown) {
    logError('Dig tool check failed:', {
      path: process.env.BIND_PATH || 'dig',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    return {
      available: false,
      path: process.env.BIND_PATH || 'dig',
      error: 'Dig tool not available'
    }
  }
}
