/**
 * 后端验证工具函数
 * 用于API请求参数验证，防止指令注入等安全问题
 */

/**
 * 验证域名格式是否有效
 * @param domain 要验证的域名
 * @returns 验证结果对象
 */
export function validateDomain(domain: string): {
  isValid: boolean;
  error?: string;
} {
  if (!domain || domain.trim() === '') {
    return {
      isValid: false,
      error: '域名不能为空'
    };
  }

  const trimmedDomain = domain.trim();
  
  // 基本长度检查
  if (trimmedDomain.length > 253) {
    return {
      isValid: false,
      error: '域名长度不能超过253个字符'
    };
  }

  // 检查是否包含非法字符（防止指令注入）
  const invalidChars = /[^a-zA-Z0-9.-]/;
  if (invalidChars.test(trimmedDomain)) {
    return {
      isValid: false,
      error: '域名只能包含字母、数字、点号和连字符'
    };
  }

  // 检查是否以点号开头或结尾
  if (trimmedDomain.startsWith('.') || trimmedDomain.endsWith('.')) {
    return {
      isValid: false,
      error: '域名不能以点号开头或结尾'
    };
  }

  // 检查是否包含连续的点号
  if (trimmedDomain.includes('..')) {
    return {
      isValid: false,
      error: '域名不能包含连续的点号'
    };
  }

  // 检查是否以连字符开头或结尾
  if (trimmedDomain.startsWith('-') || trimmedDomain.endsWith('-')) {
    return {
      isValid: false,
      error: '域名不能以连字符开头或结尾'
    };
  }

  // 检查标签格式（每个点号分隔的部分）
  const labels = trimmedDomain.split('.');
  
  for (const label of labels) {
    if (label.length === 0) {
      return {
        isValid: false,
        error: '域名标签不能为空'
      };
    }
    
    if (label.length > 63) {
      return {
        isValid: false,
        error: '域名标签长度不能超过63个字符'
      };
    }
    
    // 检查标签是否以连字符开头或结尾
    if (label.startsWith('-') || label.endsWith('-')) {
      return {
        isValid: false,
        error: '域名标签不能以连字符开头或结尾'
      };
    }
  }

  // 检查是否至少有一个点号（顶级域名）
  if (!trimmedDomain.includes('.')) {
    return {
      isValid: false,
      error: '请输入完整的域名（包含顶级域名）'
    };
  }

  // 检查顶级域名格式
  const tld = labels[labels.length - 1];
  if (tld.length < 2) {
    return {
      isValid: false,
      error: '顶级域名至少需要2个字符'
    };
  }

  // 检查顶级域名是否只包含字母
  if (!/^[a-zA-Z]+$/.test(tld)) {
    return {
      isValid: false,
      error: '顶级域名只能包含字母'
    };
  }

  // 额外的安全检查：防止常见的指令注入尝试
  const dangerousPatterns = [
    /[;&|`$()]/,
    /\s/,
    /\.\./,
    /\/\//,
    /\\\\/,
    /<script/i,
    /javascript:/i,
    /data:/i,
    /vbscript:/i
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(trimmedDomain)) {
      return {
        isValid: false,
        error: '域名包含非法字符或模式'
      };
    }
  }

  return {
    isValid: true
  };
}

/**
 * 合法的DNS记录类型列表
 */
export const VALID_RECORD_TYPES = [
  'A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT', 'SOA', 'PTR', 'SRV',
  'CAA', 'DS', 'DNSKEY', 'NSEC', 'NSEC3', 'RRSIG', 'TLSA',
  'ANY', 'AXFR', 'IXFR'
] as const;

/**
 * 验证DNS记录类型是否合法
 * @param recordType 要验证的记录类型
 * @returns 验证结果对象
 */
export function validateRecordType(recordType: string): {
  isValid: boolean;
  error?: string;
} {
  if (!recordType || recordType.trim() === '') {
    return {
      isValid: false,
      error: '记录类型不能为空'
    };
  }

  const trimmedType = recordType.trim().toUpperCase();

  // 检查是否在合法列表中
  if (!VALID_RECORD_TYPES.includes(trimmedType as any)) {
    return {
      isValid: false,
      error: `不支持的记录类型: ${recordType}。支持的类型: ${VALID_RECORD_TYPES.join(', ')}`
    };
  }

  // 检查是否包含非法字符
  const invalidChars = /[^A-Z0-9]/;
  if (invalidChars.test(trimmedType)) {
    return {
      isValid: false,
      error: '记录类型只能包含字母和数字'
    };
  }

  return {
    isValid: true
  };
}

/**
 * 验证subnet参数（如果提供）
 * @param subnet 要验证的子网
 * @returns 验证结果对象
 */
export function validateSubnet(subnet: string): {
  isValid: boolean;
  error?: string;
} {
  if (!subnet || subnet.trim() === '') {
    return {
      isValid: true // subnet是可选的
    };
  }

  const trimmedSubnet = subnet.trim();

  // 检查IPv4 CIDR格式
  const ipv4CidrPattern = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
  if (ipv4CidrPattern.test(trimmedSubnet)) {
    // 进一步验证IP地址范围
    const [ip, prefix] = trimmedSubnet.split('/');
    const prefixLength = parseInt(prefix);
    
    if (prefixLength < 0 || prefixLength > 32) {
      return {
        isValid: false,
        error: 'IPv4子网前缀长度必须在0-32之间'
      };
    }

    // 验证IP地址各部分
    const ipParts = ip.split('.');
    for (const part of ipParts) {
      const num = parseInt(part);
      if (num < 0 || num > 255) {
        return {
          isValid: false,
          error: 'IPv4地址格式无效'
        };
      }
    }

    return {
      isValid: true
    };
  }

  // 检查IPv6 CIDR格式
  const ipv6CidrPattern = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\/\d{1,3}$/;
  if (ipv6CidrPattern.test(trimmedSubnet)) {
    const [ip, prefix] = trimmedSubnet.split('/');
    const prefixLength = parseInt(prefix);
    
    if (prefixLength < 0 || prefixLength > 128) {
      return {
        isValid: false,
        error: 'IPv6子网前缀长度必须在0-128之间'
      };
    }

    return {
      isValid: true
    };
  }

  return {
    isValid: false,
    error: '子网格式无效，请使用IPv4或IPv6 CIDR格式（如：192.168.1.0/24）'
  };
}

/**
 * 综合验证API请求参数
 * @param params 请求参数
 * @returns 验证结果对象
 */
export function validateApiParams(params: {
  domain: string;
  recordType?: string;
  subnet?: string;
}): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 验证域名
  const domainValidation = validateDomain(params.domain);
  if (!domainValidation.isValid) {
    errors.push(domainValidation.error!);
  }

  // 验证记录类型
  if (params.recordType) {
    const recordTypeValidation = validateRecordType(params.recordType);
    if (!recordTypeValidation.isValid) {
      errors.push(recordTypeValidation.error!);
    }
  }

  // 验证子网
  if (params.subnet) {
    const subnetValidation = validateSubnet(params.subnet);
    if (!subnetValidation.isValid) {
      errors.push(subnetValidation.error!);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
