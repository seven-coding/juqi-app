// 用户校验统一策略：测试环境默认放行，便于测试发帖/评论/转发等
// 仅此一处根据环境决定「是否跳过用户权限校验」

/**
 * 是否跳过用户权限校验（joinStatus 等）
 * @param {object} event - 请求 event，含 dataEnv
 * @returns {boolean} true 时各接口跳过「用户未通过验证」类校验
 */
function shouldBypassUserCheck(event) {
  return event && event.dataEnv === 'test';
}

module.exports = {
  shouldBypassUserCheck
};
