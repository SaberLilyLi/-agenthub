export function formatCount(value?: number | null): string {
  const count = typeof value === 'number' && Number.isFinite(value) ? value : 0
  if (count >= 10000) return `${(count / 10000).toFixed(1).replace(/\.0$/, '')}w`
  if (count >= 1000) return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return String(count)
}

export function relativeTime(input?: string | Date | null): string {
  if (!input) return ''
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) return ''
  const diffMs = Date.now() - date.getTime()
  if (diffMs < 60 * 1000) return '刚刚'
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} 天前`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} 个月前`
  return `${Math.floor(months / 12)} 年前`
}
