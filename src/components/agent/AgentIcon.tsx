import Image from 'next/image'
import {
  BarChart3,
  Bot,
  Code2,
  FileText,
  Headphones,
  Mail,
  Megaphone,
  MessagesSquare,
  ShoppingCart,
  Users,
  type LucideIcon,
} from 'lucide-react'

import { cn } from '@/utilities/ui'

const PALETTES = [
  { bg: 'bg-blue-50', text: 'text-blue-600', ring: 'ring-blue-100' },
  { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-100' },
  { bg: 'bg-violet-50', text: 'text-violet-600', ring: 'ring-violet-100' },
  { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-100' },
  { bg: 'bg-rose-50', text: 'text-rose-600', ring: 'ring-rose-100' },
  { bg: 'bg-cyan-50', text: 'text-cyan-600', ring: 'ring-cyan-100' },
] as const

const ICON_RULES: Array<{ keys: string[]; icon: LucideIcon; palette: number }> = [
  { keys: ['data', '分析', '报表', 'chart', 'bi', '商业智能'], icon: BarChart3, palette: 1 },
  { keys: ['mail', '邮件', '邮箱', 'email'], icon: Mail, palette: 2 },
  { keys: ['meeting', '会议', '纪要', '录音'], icon: MessagesSquare, palette: 0 },
  { keys: ['report', '周报', '汇报', 'weekly', '文档'], icon: FileText, palette: 3 },
  { keys: ['code', 'dev', '开发', '代码', 'git', '工具'], icon: Code2, palette: 4 },
  { keys: ['market', '营销', '推广', '内容', '创作'], icon: Megaphone, palette: 5 },
  { keys: ['service', '客服', '客户', '沟通'], icon: Headphones, palette: 1 },
  { keys: ['hr', '招聘', '人事'], icon: Users, palette: 2 },
  { keys: ['shop', '电商', 'commerce', '运营'], icon: ShoppingCart, palette: 3 },
]

const SIZES = {
  sm: { box: 'size-9 rounded-lg', icon: 'size-4.5' },
  md: { box: 'size-11 rounded-[10px]', icon: 'size-5.5' },
  lg: { box: 'size-14 rounded-xl', icon: 'size-7' },
} as const

type AgentIconProps = {
  name: string
  categorySlug?: string | null
  categoryName?: string | null
  coverUrl?: string | null
  coverAlt?: string
  size?: keyof typeof SIZES
  className?: string
}

function hashText(text: string): number {
  let hash = 0
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0
  }
  return hash
}

export function AgentIcon({ name, categorySlug, categoryName, coverUrl, coverAlt, size = 'md', className }: AgentIconProps) {
  const sizeClass = SIZES[size]

  if (coverUrl) {
    return (
      <span className={cn('relative block shrink-0 overflow-hidden ring-1 ring-inset ring-black/5', sizeClass.box, className)}>
        <Image src={coverUrl} alt={coverAlt || name} fill className="object-cover" sizes="56px" />
      </span>
    )
  }

  const haystack = `${categorySlug ?? ''} ${categoryName ?? ''} ${name}`.toLowerCase()
  const rule = ICON_RULES.find((item) => item.keys.some((key) => haystack.includes(key)))
  const palette = PALETTES[rule?.palette ?? hashText(haystack) % PALETTES.length]
  const Icon = rule?.icon ?? Bot

  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center ring-1 ring-inset',
        sizeClass.box,
        palette.bg,
        palette.ring,
        className,
      )}
    >
      <Icon className={cn(sizeClass.icon, palette.text)} />
    </span>
  )
}
