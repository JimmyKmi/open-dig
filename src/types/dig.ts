export interface DigOptions {
  domain: string;
  recordType?: string;
  dnsServer?: string;
  subnet?: string;
}

export interface DigAnswer {
  name: string;
  type: number;
  class: number;
  ttl: number;
  rdlength: number;
  rdata: string;
}

// 移除statistics相关类型定义

export interface DigHeader {
  id?: number;
  opcode?: string;
  flags?: string;
}

export interface DigSubnet {
  subnet: string;
  scope: number;
}

export interface DigParsedResult {
  status: string;
  header?: DigHeader;
  subnet?: DigSubnet;
  answer?: DigAnswer[];
  authority?: DigAnswer[];
  additional?: DigAnswer[];
  rawOutput?: string;
}

export interface DigResult {
  output: string;
  parsed: DigParsedResult;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  code?: string;
  message?: string;
}
