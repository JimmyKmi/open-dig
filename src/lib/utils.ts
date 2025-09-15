import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 验证域名格式是否有效
 * @param domain 要验证的域名
 * @returns 验证结果对象
 */
export function validateDomain(domain: string): {
  isValid: boolean
  error?: string
} {
  if (!domain || domain.trim() === '') {
    return {
      isValid: false,
      error: '域名不能为空'
    }
  }

  const trimmedDomain = domain.trim()

  // 基本长度检查
  if (trimmedDomain.length > 253) {
    return {
      isValid: false,
      error: '域名长度不能超过253个字符'
    }
  }

  // 检查是否包含非法字符
  const invalidChars = /[^a-zA-Z0-9.-]/
  if (invalidChars.test(trimmedDomain)) {
    return {
      isValid: false,
      error: '域名只能包含字母、数字、点号和连字符'
    }
  }

  // 检查是否以点号开头或结尾
  if (trimmedDomain.startsWith('.') || trimmedDomain.endsWith('.')) {
    return {
      isValid: false,
      error: '域名不能以点号开头或结尾'
    }
  }

  // 检查是否包含连续的点号
  if (trimmedDomain.includes('..')) {
    return {
      isValid: false,
      error: '域名不能包含连续的点号'
    }
  }

  // 检查是否以连字符开头或结尾
  if (trimmedDomain.startsWith('-') || trimmedDomain.endsWith('-')) {
    return {
      isValid: false,
      error: '域名不能以连字符开头或结尾'
    }
  }

  // 检查标签格式（每个点号分隔的部分）
  const labels = trimmedDomain.split('.')

  for (const label of labels) {
    if (label.length === 0) {
      return {
        isValid: false,
        error: '域名标签不能为空'
      }
    }

    if (label.length > 63) {
      return {
        isValid: false,
        error: '域名标签长度不能超过63个字符'
      }
    }

    // 检查标签是否以连字符开头或结尾
    if (label.startsWith('-') || label.endsWith('-')) {
      return {
        isValid: false,
        error: '域名标签不能以连字符开头或结尾'
      }
    }
  }

  // 检查是否至少有一个点号（顶级域名）
  if (!trimmedDomain.includes('.')) {
    return {
      isValid: false,
      error: '请输入完整的域名（包含顶级域名）'
    }
  }

  // 检查顶级域名格式
  const tld = labels[labels.length - 1]
  if (tld.length < 2) {
    return {
      isValid: false,
      error: '顶级域名至少需要2个字符'
    }
  }

  // 检查顶级域名是否只包含字母
  if (!/^[a-zA-Z]+$/.test(tld)) {
    return {
      isValid: false,
      error: '顶级域名只能包含字母'
    }
  }

  return {
    isValid: true
  }
}
