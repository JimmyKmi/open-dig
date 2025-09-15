export interface DigOptions {
  domain: string
  recordType?: string
  subnet?: string
}

export interface DigAnswer {
  name: string
  type: string
  class: number
  ttl: number
  rdlength: number
  rdata: string
}

// 移除statistics相关类型定义

export interface DigHeader {
  id?: number
  opcode?: string
  flags?: string
}

export interface DigSubnet {
  subnet: string
  scope: number
}

export interface DigParsedResult {
  status: string
  header?: DigHeader
  subnet?: DigSubnet | null
  answer?: DigAnswer[]
  authority?: DigAnswer[]
  additional?: DigAnswer[]
  rawOutput?: string
  lastCname?: string // 最后一跳cname
}

export interface DigResult {
  output: string
  parsed: DigParsedResult
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  code?: string
  message?: string
  errors?: string[]
}

// 多子网查询结果类型
export interface MultiSubnetQueryResult {
  successfulResults: SubnetQueryResult[]
  failedResults: FailedSubnetQueryResult[]
  totalQueries: number
  successCount: number
  failureCount: number
}

export interface SubnetQueryResult {
  subnetInfo: {
    country: string
    region: string
    province: string
    isp: string
    subnet: string
  }
  result: DigResult
  success: true
}

export interface FailedSubnetQueryResult {
  subnetInfo: {
    country: string
    region: string
    province: string
    isp: string
    subnet: string
  }
  error: string
  success: false
}
