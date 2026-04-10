import { NextRequest, NextResponse } from 'next/server'

const CA_BASE = process.env.COACH_ACCOUNTABLE_BASE_URL!
const CA_KEY = process.env.COACH_ACCOUNTABLE_API_KEY!

function stripHTML(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const clientName = searchParams.get('clientName')
  const clientId = searchParams.get('clientId')

  if (!clientName && !clientId) {
    return NextResponse.json({ error: 'clientName or clientId required' }, { status: 400 })
  }

  const headers = {
    'X-API-Key': CA_KEY,
    'Content-Type': 'application/json',
  }

  let resolvedClientId = clientId

  // If we have a name but not an ID, look up the client
  if (!resolvedClientId && clientName) {
    console.log('CA_BASE:', CA_BASE)
    console.log('CA_KEY length:', CA_KEY?.length)
    console.log('CA_KEY prefix:', CA_KEY?.substring(0, 6))
    const clientRes = await fetch(`${CA_BASE}/clients`, { headers })
    console.log('CA status:', clientRes.status)
    const clientText = await clientRes.text()
    console.log('CA clients raw:', clientText.substring(0, 200))
    const clients = JSON.parse(clientText)
    const match = clients.find((c: any) => {
      const fullName = `${c.firstName} ${c.lastName}`.toLowerCase()
      return fullName.includes(clientName.toLowerCase())
    })
    if (!match) {
      return NextResponse.json({ error: `No client found matching: ${clientName}` }, { status: 404 })
    }
    resolvedClientId = match.id
  }

  // Pull last 6 months of session notes
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const dateFrom = sixMonthsAgo.toISOString().split('T')[0]

  const notesRes = await fetch(
    `${CA_BASE}/sessionNotes?ClientID=${resolvedClientId}&dateFrom=${dateFrom}`,
    { headers }
  )
  const rawNotes = await notesRes.json()

  // Also pull open actions
  const actionsRes = await fetch(
    `${CA_BASE}/actions?ClientID=${resolvedClientId}&status=incomplete`,
    { headers }
  )
  const rawActions = await actionsRes.json()

  const notes = (rawNotes || []).map((n: any) => ({
    id: n.ID,
    date: n.dateOf,
    title: n.title,
    content: stripHTML(n.content || ''),
  }))

  const actions = (rawActions || []).map((a: any) => ({
    id: a.ID,
    description: a.description,
    dueDate: a.dueDate,
    status: a.status,
  }))

  return NextResponse.json({ clientId: resolvedClientId, notes, actions })
}
