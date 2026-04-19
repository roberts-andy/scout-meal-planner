import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { EmailClient } from '@azure/communication-email'
import { DefaultAzureCredential } from '@azure/identity'
import { getById } from '../cosmosdb.js'
import { getTroopContext, unauthorized, forbidden } from '../middleware/auth.js'
import { checkPermission } from '../middleware/roles.js'
import { emailShoppingListSchema, validationError } from '../schemas.js'

const EVENTS_CONTAINER = 'events'

let emailClient: EmailClient | undefined

function getEmailClient(): EmailClient {
  if (!emailClient) {
    const endpoint = process.env.ACS_ENDPOINT
    if (!endpoint) throw new Error('ACS_ENDPOINT is not configured')
    emailClient = new EmailClient(`https://${endpoint}`, new DefaultAzureCredential())
  }
  return emailClient
}

/** @internal Exposed for testing only */
export function _setEmailClient(client: EmailClient | undefined) {
  emailClient = client
}

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

    const fromEmail = process.env.ACS_FROM_EMAIL
    if (!fromEmail) {
      context.error('Missing ACS_FROM_EMAIL')
      return { status: 500, jsonBody: { error: 'Email service not configured' } }
    }

    let client: EmailClient
    try {
      client = getEmailClient()
    } catch {
      context.error('Missing ACS_ENDPOINT')
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

    const message = {
      senderAddress: fromEmail,
      recipients: { to: [{ address: recipientEmail }] },
      content: {
        subject: `Shopping List: ${resolvedEventName}`,
        plainText: `Shopping list for ${resolvedEventName}\n\n${textRows}`,
        html: `<h2>Shopping list for ${escapeHtml(resolvedEventName)}</h2><table style="border-collapse:collapse;"><thead><tr><th style="padding:4px 8px;text-align:left;">Item</th><th style="padding:4px 8px;text-align:right;">Quantity</th><th style="padding:4px 8px;text-align:left;">Unit</th></tr></thead><tbody>${htmlRows}</tbody></table>`,
      },
    }

    const poller = await client.beginSend(message)
    const result = await poller.pollUntilDone()

    if (result.status !== 'Succeeded') {
      context.error('ACS email send failed:', result.error)
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
