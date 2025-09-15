// 日志模块 - 提供统一的日志功能

// 日志辅助函数
export const isDebugMode = (): boolean => process.env.DEBUG === 'true';

export const logInfo = (message: string, ...args: unknown[]): void => {
  console.log(`[INFO] ${message}`, ...args);
};

export const logDebug = (message: string, ...args: unknown[]): void => {
  if (isDebugMode()) {
    console.log(`[DEBUG] ${message}`, ...args);
  }
};

export const logError = (message: string, ...args: unknown[]): void => {
  console.error(`[ERROR] ${message}`, ...args);
};

export const logWarn = (message: string, ...args: unknown[]): void => {
  console.warn(`[WARN] ${message}`, ...args);
};

// 启动时输出系统信息
let startupInfoLogged = false;

export const logStartupInfo = (): void => {
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
