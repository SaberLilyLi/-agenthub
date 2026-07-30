import COS from 'cos-nodejs-sdk-v5'

import { requiredEnvironment, requiredSecret } from './serverEnv'

export function cosClient() {
  return new COS({
    SecretId: requiredSecret('TENCENT_SECRET_ID'),
    SecretKey: requiredSecret('TENCENT_SECRET_KEY', 16),
  })
}

export function cosConfig() {
  return {
    Bucket: requiredEnvironment('TENCENT_COS_BUCKET'),
    Region: requiredEnvironment('TENCENT_COS_REGION'),
  }
}

export function cosPublicUrl(key: string) {
  const { Bucket, Region } = cosConfig()
  return `https://${Bucket}.cos.${Region}.myqcloud.com/${key}`
}
