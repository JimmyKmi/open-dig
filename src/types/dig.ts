export interface DigOptions {
  domain: string;
  recordType?: string;
  dnsServer?: string;
}

export interface DigAnswer {
  name: string;
  type: number;
  class: number;
  ttl: number;
  rdlength: number;
  rdata: string;
}

export interface DigStatistics {
  queryTime: string;
  server: string;
  when: string;
  msgSize: string;
}

export interface DigParsedResult {
  status: string;
  answer?: DigAnswer[];
  authority?: DigAnswer[];
  additional?: DigAnswer[];
  statistics?: DigStatistics;
  rawOutput?: string;
}

export interface DigResult {
  command: string;
  output: string;
  parsed: DigParsedResult;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  code?: string;
  message?: string;
}
