import * as LucideIcons from 'lucide-react'

export const AVAILABLE_ICONS = [
  'Tag', 'Folder', 'Star', 'Heart', 'Coffee', 'Music', 'Camera', 'Book',
  'Code', 'Globe', 'Gamepad2', 'Briefcase', 'Home', 'Zap', 'Pill',
  'ShoppingBag', 'Car', 'Plane', 'Smartphone', 'Monitor', 'Dumbbell',
  'Baby', 'Dog', 'Cat', 'Palmtree', 'MessageCircle', 'Share2', 'Link',
  'Hash', 'Search', 'Bell', 'Settings', 'User', 'Mail', 'Calendar'
] as const

export type LucideIconName = keyof typeof LucideIcons

export interface IconRendererProps {
  name: string
  size?: number
  color?: string
  className?: string
}

export default function IconRenderer({
  name,
  size = 16,
  color = 'currentColor',
  className = '',
}: IconRendererProps) {
  // @ts-ignore
  const IconComponent = LucideIcons[name]

  if (!IconComponent) {
    const Fallback = LucideIcons.Tag
    return <Fallback size={size} color={color} className={className} />
  }

  return <IconComponent size={size} color={color} className={className} />
}
