/**
 * Token 验证工具
 * 与云函数 appApi/utils/token.js 保持一致
 */
import * as jwt from 'jsonwebtoken';

// JWT 密钥（与云函数保持一致）
const PRIVATE_KEY = '601a5dd02c01d5d9e0e776fde804f27d';
// Token 有效期
const TOKEN_EXPIRES_IN = '30d';
// Token 刷新阈值（7天内自动刷新）
const TOKEN_REFRESH_THRESHOLD = 7 * 24 * 60 * 60 * 1000;

export interface TokenVerifyResult {
  valid: boolean;
  openId: string | null;
  expired: boolean;
  needRefresh: boolean;
  expiresAt: number | null;
  error: string | null;
}

export interface TokenRefreshResult {
  newToken: string | null;
  openId: string | null;
  success: boolean;
  refreshed: boolean;
  error?: string;
}

/**
 * 验证 Token 并解析 openId
 * @param token - 用户 Token
 * @returns 验证结果
 */
export function verifyToken(token: string): TokenVerifyResult {
  if (!token) {
    return {
      valid: false,
      openId: null,
      expired: false,
      needRefresh: false,
      expiresAt: null,
      error: 'Token为空',
    };
  }

  try {
    // 先解码（不验证）以获取过期时间
    const decoded = jwt.decode(token) as any;
    if (!decoded) {
      return {
        valid: false,
        openId: null,
        expired: true,
        needRefresh: false,
        expiresAt: null,
        error: 'Token格式无效',
      };
    }

    // 验证 Token（会检查过期）
    try {
      jwt.verify(token, PRIVATE_KEY);

      // Token 有效，检查是否需要刷新
      const expiresAt = decoded.exp ? decoded.exp * 1000 : null;
      const now = Date.now();
      const needRefresh = expiresAt && expiresAt - now < TOKEN_REFRESH_THRESHOLD;

      return {
        valid: true,
        openId: decoded.openId,
        expired: false,
        needRefresh: needRefresh,
        expiresAt: expiresAt,
        error: null,
      };
    } catch (verifyError: any) {
      // Token 验证失败（可能是过期）
      const isExpired = verifyError.name === 'TokenExpiredError';
      return {
        valid: false,
        openId: decoded.openId,
        expired: isExpired,
        needRefresh: false,
        expiresAt: decoded.exp ? decoded.exp * 1000 : null,
        error: isExpired ? 'Token已过期' : 'Token验证失败',
      };
    }
  } catch (error: any) {
    return {
      valid: false,
      openId: null,
      expired: false,
      needRefresh: false,
      expiresAt: null,
      error: error.message || 'Token解析失败',
    };
  }
}

/**
 * 生成 Token
 * @param openId - 用户 openId
 * @returns Token
 */
export function generateToken(openId: string): string {
  return jwt.sign({ openId }, PRIVATE_KEY, { expiresIn: TOKEN_EXPIRES_IN });
}

/**
 * 刷新 Token（如果 Token 即将过期或已过期但 openId 有效）
 * @param token - 当前 Token
 * @returns 刷新结果
 */
export function refreshTokenIfNeeded(token: string): TokenRefreshResult {
  const tokenResult = verifyToken(token);

  // Token 有效且不需要刷新
  if (tokenResult.valid && !tokenResult.needRefresh) {
    return {
      newToken: null,
      openId: tokenResult.openId,
      success: true,
      refreshed: false,
    };
  }

  // Token 已过期或需要刷新，但 openId 有效，可以刷新
  if (tokenResult.openId && (tokenResult.expired || tokenResult.needRefresh)) {
    const newToken = generateToken(tokenResult.openId);
    return {
      newToken: newToken,
      openId: tokenResult.openId,
      success: true,
      refreshed: true,
    };
  }

  // 无法刷新
  return {
    newToken: null,
    openId: null,
    success: false,
    refreshed: false,
    error: tokenResult.error || '无法刷新Token',
  };
}

/**
 * 从 Token 中提取 openId（不验证有效性）
 * @param token - 用户 Token
 * @returns openId 或 null
 */
export function extractOpenId(token: string): string | null {
  if (!token) return null;
  try {
    const decoded = jwt.decode(token) as any;
    return decoded?.openId || null;
  } catch {
    return null;
  }
}
