import type { GlobalConfig } from 'payload'

import { hasSystemAdminRole, isSystemAdmin } from '../access/isAdmin'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: '网站设置',
  admin: { hidden: ({ user }) => !hasSystemAdminRole(user) },
  access: { read: () => true, update: isSystemAdmin },
  fields: [
    { name: 'siteName', label: '网站名称', type: 'text', defaultValue: '鲸创 AgentHub' },
    { name: 'description', label: '网站描述', type: 'textarea', defaultValue: '智能体应用发现平台' },
    { name: 'contactEmail', label: '联系邮箱', type: 'email' },
    { name: 'icp', label: 'ICP备案号', type: 'text' },
    { name: 'policeRecord', label: '公安备案号', type: 'text' },
    { name: 'about', label: '关于我们', type: 'textarea' },
  ],
}
