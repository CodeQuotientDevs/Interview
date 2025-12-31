// s3.ts
import { S3Client } from "@aws-sdk/client-s3"
import crypto from "crypto"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { PutObjectCommand } from "@aws-sdk/client-s3"

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export async function getPresignedUploadUrl(
  contentType: string
) {
  const fileId = crypto.randomUUID()
  const extension = contentType.split('/')[1] || 'bin'
  const key = `audio/${fileId}.${extension}`

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
    ACL: "public-read"
  })

  const uploadUrl = await getSignedUrl(s3, command, {
    expiresIn: 60 * 5, // 5 minutes
  })

  return {
    uploadUrl,
    fileUrl: `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
    key,
  }
}
