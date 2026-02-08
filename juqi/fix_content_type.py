#!/usr/bin/env python3
"""
修改 apple-app-site-association 文件的 Content-Type
使用腾讯云 COS SDK
"""

import os
import sys
from qcloud_cos import CosConfig
from qcloud_cos import CosS3Client

# 配置信息（需要从环境变量或配置文件中读取）
# 这些信息通常可以从云开发控制台获取
SECRET_ID = os.environ.get('TENCENT_SECRET_ID', '')
SECRET_KEY = os.environ.get('TENCENT_SECRET_KEY', '')
REGION = 'ap-shanghai'
BUCKET = 'a0d1-static-prod-juqi-7glu2m8qfa31e13f-1314478640'
KEY = '.well-known/apple-app-site-association'

def modify_content_type():
    """修改文件的 Content-Type"""
    try:
        # 创建配置对象
        config = CosConfig(
            Region=REGION,
            SecretId=SECRET_ID,
            SecretKey=SECRET_KEY
        )
        
        # 创建客户端
        client = CosS3Client(config)
        
        # 复制对象并替换元数据
        copy_source = {
            'Bucket': BUCKET,
            'Key': KEY,
            'Region': REGION
        }
        
        response = client.copy_object(
            Bucket=BUCKET,
            Key=KEY,
            CopySource=copy_source,
            MetadataDirective='REPLACE',
            ContentType='application/json'
        )
        
        print(f"✅ 成功修改 Content-Type 为 application/json")
        print(f"响应: {response}")
        return True
        
    except Exception as e:
        print(f"❌ 修改失败: {str(e)}")
        print("\n提示：")
        print("1. 确保已安装 qcloud_cos: pip install cos-python-sdk-v5")
        print("2. 设置环境变量 TENCENT_SECRET_ID 和 TENCENT_SECRET_KEY")
        return False

if __name__ == '__main__':
    if not SECRET_ID or not SECRET_KEY:
        print("❌ 错误：需要设置 TENCENT_SECRET_ID 和 TENCENT_SECRET_KEY 环境变量")
        print("\n使用方法：")
        print("export TENCENT_SECRET_ID='your_secret_id'")
        print("export TENCENT_SECRET_KEY='your_secret_key'")
        print("python3 fix_content_type.py")
        sys.exit(1)
    
    modify_content_type()
