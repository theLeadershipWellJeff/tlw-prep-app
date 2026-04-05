import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { google } from 'googleapis'
import { authOptions } from '@/lib/authOptions'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  auth.setCredentials({ access_token: session.accessToken as string })

  const calendar = google.calendar({ version: 'v3', auth })

  const now = new Date()
  const twoWeeksOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: now.toISOString(),
    timeMax: twoWeeksOut.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 50,
  })

  const events = res.data.items || []

  // Filter for likely coaching sessions (1:1 events with attendees)
  const sessions = events
    .filter(e => {
      const title = (e.summary || '').toLowerCase()
      const hasAttendees = (e.attendees?.length || 0) > 1
      // Flag events that look like coaching sessions
      const isCoaching =
        title.includes('coaching') ||
        title.includes('session') ||
        title.includes('1:1') ||
        title.includes('tlw') ||
        hasAttendees
      return isCoaching
    })
    .map(e => {
      // Extract client name from attendees (not jeff's email)
      const jeffEmails = [
        process.env.JEFF_FROM_EMAIL,
        process.env.JEFF_CC_EMAIL,
      ]
      const client = e.attendees?.find(
        a => !jeffEmails.includes(a.email || '')
      )

      return {
        id: e.id,
        title: e.summary,
        start: e.start?.dateTime || e.start?.date,
        end: e.end?.dateTime || e.end?.date,
        clientName: client?.displayName || extractNameFromTitle(e.summary || ''),
        clientEmail: client?.email || '',
        duration: getDuration(e.start?.dateTime ?? undefined, e.end?.dateTime ?? undefined),
        meetLink: e.hangoutLink || e.location || '',
      }
    })

  return NextResponse.json({ sessions })
}

function extractNameFromTitle(title: string): string {
  // Try to extract a client name from event titles like "Coaching - Lisa Fischer"
  const patterns = [
    /coaching[:\s-]+(.+)/i,
    /session[:\s-]+(.+)/i,
    /1:1[:\s-]+(.+)/i,
    /tlw[:\s-]+(.+)/i,
  ]
  for (const pattern of patterns) {
    const match = title.match(pattern)
    if (match) return match[1].trim()
  }
  return title
}

function getDuration(start?: string, end?: string): number {
  if (!start || !end) return 55
  const diff = new Date(end).getTime() - new Date(start).getTime()
  return Math.round(diff / 60000)
}
