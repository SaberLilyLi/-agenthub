import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { payloadForRequest } from '@/lib/auth'
const schema=z.object({name:z.string().trim().min(2).max(50)})
export async function PATCH(request:NextRequest){const parsed=schema.safeParse(await request.json());if(!parsed.success)return NextResponse.json({message:'昵称长度应为 2 到 50 个字符'},{status:400});const {payload,user}=await payloadForRequest(request);if(!user||user.collection!=='users')return NextResponse.json({message:'请先登录'},{status:401});const updated=await payload.update({collection:'users',id:user.id,data:{name:parsed.data.name},overrideAccess:false});return NextResponse.json({user:{id:updated.id,name:updated.name,email:updated.email}})}
