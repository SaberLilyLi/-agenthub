import { NextResponse } from 'next/server'
export async function POST(){const response=NextResponse.json({ok:true});response.cookies.set('agenthub-user-token','',{httpOnly:true,path:'/',maxAge:0});response.cookies.set('agenthub-admin-token','',{httpOnly:true,path:'/',maxAge:0});response.cookies.set('payload-token','',{httpOnly:true,path:'/',maxAge:0});return response}
