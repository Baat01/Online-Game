import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/Toast'
import { markNotificationRead } from './notificationService'

export function GlobalNotificationListener() {
  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (!user) return

    const channel = supabase.channel(`notifications:${user.id}`)
    
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
      (payload) => {
        const notif = payload.new as any
        
        // Show toast
        toast(
          `${notif.type.replace('_', ' ').toUpperCase()}: ${JSON.stringify(notif.payload)}`,
          'info'
        )
        
        // Auto-mark as read for now
        markNotificationRead(notif.id).catch(console.error)
      }
    )

    channel.subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, toast])

  return null
}
