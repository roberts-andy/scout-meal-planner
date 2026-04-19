import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getTroopContext, unauthorized, forbidden } from '../middleware/auth.js'
import { checkPermission } from '../middleware/roles.js'
import { sendShoppingListEmailSchema, validationError } from '../schemas.js'
import { z } from 'zod'

type ShoppingListEmailItem = z.infer<typeof sendShoppingListEmailSchema>['items'][number]

function formatItemLine(item: ShoppingListEmailItem): string {
  const quantity = Number.isInteger(item.quantity) ? item.quantity.toString() : String(item.quantity)
  const unit = item.unit === 'to-taste' ? 'to taste' : item.unit
  return `${item.name}: ${quantity} ${unit}`
}

function buildEmailBody(eventName: string, items: ShoppingListEmailItem[]) {
  const textItems = items.map((item) => `- ${formatItemLine(item)}`).join('\n')
  const htmlItems = items.map((item) => `<li>${formatItemLine(item)}</li>`).join('')

  return {
    text: `Shopping List for ${eventName}\n\n${textItems}`,
    html: `<h2>Shopping List for ${eventName}</h2><ul>${htmlItems}</ul>`,
  }
}

async function sendViaSendGrid(recipientEmail: string, eventName: string, items: ShoppingListEmailItem[]) {
  const apiKey = process.env.SENDGRID_API_KEY
  const fromEmail = process.env.SENDGRID_FROM_EMAIL

  if (!apiKey || !fromEmail) {
    throw new Error('Email service is not configured')
  }

  const body = buildEmailBody(eventName, items)

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: recipientEmail }] }],
      from: { email: fromEmail },
      subject: `Shopping List: ${eventName}`,
      content: [
        { type: 'text/plain', value: body.text },
        { type: 'text/html', value: body.html },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`Email delivery failed (HTTP ${response.status})`)
  }
}

async function emailShoppingListHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('POST /api/shopping-list/email')

  const auth = await getTroopContext(req, context)
  if (!auth) return unauthorized()
  if (!checkPermission(auth.role, 'viewContent')) return forbidden()

  try {
    const parsed = sendShoppingListEmailSchema.safeParse(await req.json())
    if (!parsed.success) return validationError(parsed.error)

    await sendViaSendGrid(parsed.data.recipientEmail, parsed.data.eventName, parsed.data.items)
    return { status: 202, jsonBody: { status: 'queued' } }
  } catch (err) {
    context.error('POST /api/shopping-list/email failed:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return { status: 500, jsonBody: { error: message } }
  }
}

app.http('emailShoppingList', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'shopping-list/email',
  handler: emailShoppingListHandler,
})
