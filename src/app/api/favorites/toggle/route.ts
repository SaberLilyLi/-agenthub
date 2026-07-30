import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { payloadForRequest } from '@/lib/auth'
const schema=z.object({agentId:z.coerce.number().int().positive()})
export async function POST(request:NextRequest){const body=schema.safeParse(await request.json());if(!body.success)return NextResponse.json({message:'参数无效'},{status:400});const {payload,user}=await payloadForRequest(request);if(!user||user.collection!=='users')return NextResponse.json({message:'请先登录'},{status:401});const found=await payload.find({collection:'favorites',where:{and:[{user:{equals:user.id}},{agent:{equals:body.data.agentId}}]},overrideAccess:true,limit:1});if(found.docs[0]){await payload.delete({collection:'favorites',id:found.docs[0].id,overrideAccess:true});return NextResponse.json({favorited:false})}await payload.create({collection:'favorites',data:{user:user.id,agent:body.data.agentId},overrideAccess:true});return NextResponse.json({favorited:true})}
