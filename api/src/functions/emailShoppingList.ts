import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getById } from '../cosmosdb.js'
import { getTroopContext, unauthorized, forbidden } from '../middleware/auth.js'
import { checkPermission } from '../middleware/roles.js'
import { emailShoppingListSchema, validationError } from '../schemas.js'

const EVENTS_CONTAINER = 'events'
const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function emailShoppingListHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const eventId = req.params.id
  context.log(`POST /api/events/${eventId}/shopping-list/email`)

  const auth = await getTroopContext(req, context)
  if (!auth) return unauthorized()
  if (!checkPermission(auth.role, 'viewContent')) return forbidden()

  try {
    const parsed = emailShoppingListSchema.safeParse(await req.json())
    if (!parsed.success) return validationError(parsed.error)

    const existingEvent = await getById<any>(EVENTS_CONTAINER, eventId, auth.troopId)
    if (!existingEvent) return { status: 404, jsonBody: { error: 'Event not found' } }

    const sendGridApiKey = process.env.SENDGRID_API_KEY
    const fromEmail = process.env.SENDGRID_FROM_EMAIL

    if (!sendGridApiKey || !fromEmail) {
      context.error('Missing SENDGRID_API_KEY or SENDGRID_FROM_EMAIL')
      return { status: 500, jsonBody: { error: 'Email service not configured' } }
    }

    const { recipientEmail, items } = parsed.data
    const resolvedEventName = typeof existingEvent.name === 'string' && existingEvent.name.length > 0
      ? existingEvent.name
      : 'Unnamed Event'
    const textRows = items.map((item) => `- ${item.name}: ${item.quantity} ${item.unit}`).join('\n')
    const htmlRows = items
      .map((item) => {
        const safeName = escapeHtml(item.name)
        const safeQuantity = escapeHtml(String(item.quantity))
        const safeUnit = escapeHtml(item.unit)
        return `<tr><td style="padding:4px 8px;">${safeName}</td><td style="padding:4px 8px;text-align:right;">${safeQuantity}</td><td style="padding:4px 8px;">${safeUnit}</td></tr>`
      })
      .join('')

    const response = await fetch(SENDGRID_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sendGridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: recipientEmail }] }],
        from: { email: fromEmail },
        subject: `Shopping List: ${resolvedEventName}`,
        content: [
          {
            type: 'text/plain',
            value: `Shopping list for ${resolvedEventName}\n\n${textRows}`,
          },
          {
            type: 'text/html',
            value: `<h2>Shopping list for ${escapeHtml(resolvedEventName)}</h2><table style="border-collapse:collapse;"><thead><tr><th style="padding:4px 8px;text-align:left;">Item</th><th style="padding:4px 8px;text-align:right;">Quantity</th><th style="padding:4px 8px;text-align:left;">Unit</th></tr></thead><tbody>${htmlRows}</tbody></table>`,
          },
        ],
      }),
    })

    if (!response.ok) {
      const sendGridError = await response.text()
      context.error('SendGrid request failed:', sendGridError)
      return { status: 502, jsonBody: { error: 'Failed to send email' } }
    }

    return { status: 202, jsonBody: { message: 'Shopping list email sent' } }
  } catch (err) {
    context.error(`POST /api/events/${eventId}/shopping-list/email failed:`, err)
    const message = err instanceof Error ? err.message : String(err)
    return { status: 500, jsonBody: { error: message } }
  }
}

app.http('emailShoppingList', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'events/{id}/shopping-list/email',
  handler: emailShoppingListHandler,
})
