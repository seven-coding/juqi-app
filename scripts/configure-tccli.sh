#!/usr/bin/env bash
# 从环境变量或 .env 读取腾讯云密钥，配置 tccli（用于命令行查账单等）
# 用法：在项目根目录执行 ./scripts/configure-tccli.sh 或 bash scripts/configure-tccli.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

# 从 .env 加载（若存在且未在环境中设置）
if [ -z "$CLOUD_BASE_ID" ] && [ -z "$TENCENT_SECRET_ID" ]; then
  for envfile in "apiServer/.env" ".env"; do
    [ -f "$envfile" ] || continue
    while IFS= read -r line; do
      [[ "$line" =~ ^[[:space:]]*# ]] && continue
      [[ "$line" =~ ^[[:space:]]*$ ]] && continue
      if [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then
        export "$line"
      fi
    done < "$envfile"
  done
fi

SECRET_ID="${CLOUD_BASE_ID:-$TENCENT_SECRET_ID}"
SECRET_KEY="${CLOUD_BASE_KEY:-$TENCENT_SECRET_KEY}"

if [ -z "$SECRET_ID" ] || [ -z "$SECRET_KEY" ]; then
  echo "未检测到密钥。请任选其一："
  echo "  1) 在 apiServer/.env 中配置 CLOUD_BASE_ID、CLOUD_BASE_KEY"
  echo "  2) 或设置环境变量: export CLOUD_BASE_ID=xxx CLOUD_BASE_KEY=xxx"
  exit 1
fi

TCCLI_BIN=""
for p in "/Users/tongyao/Library/Python/3.9/bin/tccli" "$HOME/Library/Python/3.9/bin/tccli" "$(which tccli 2>/dev/null)"; do
  [ -n "$p" ] && [ -x "$p" ] && TCCLI_BIN="$p" && break
done
if [ -z "$TCCLI_BIN" ]; then
  echo "未找到 tccli，请先执行: pip3 install tccli"
  exit 1
fi

mkdir -p "$HOME/.tccli"
"$TCCLI_BIN" configure set secretId "$SECRET_ID" secretKey "$SECRET_KEY" region ap-shanghai output json
echo "tccli 已配置完成（region=ap-shanghai）。查账单示例："
echo "  $TCCLI_BIN billing DescribeBillSummary --Month 2025-02 --GroupType business"
