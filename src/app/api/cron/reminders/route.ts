import { NextResponse } from 'next/server'
import { processAutomatedReminders } from '@/app/api/notifications/reminders'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Check auth header if CRON_SECRET is configured
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await processAutomatedReminders()
  return NextResponse.json({ success: true, result })
}

export async function POST(request: Request) {
  return GET(request)
}
