import { Router, Request, Response } from 'express'
import { getAll, create, update, remove, queryItems } from '../cosmosdb'

const router = Router()
const CONTAINER = 'feedback'

router.get('/', async (_req: Request, res: Response) => {
  try {
    const feedback = await getAll(CONTAINER)
    res.json(feedback)
  } catch (err) {
    console.error('GET /feedback failed:', err)
    res.status(500).json({ error: 'Failed to fetch feedback' })
  }
})

router.get('/event/:eventId', async (req: Request, res: Response) => {
  try {
    const feedback = await queryItems(
      CONTAINER,
      'SELECT * FROM c WHERE c.eventId = @eventId',
      [{ name: '@eventId', value: req.params.eventId }]
    )
    res.json(feedback)
  } catch (err) {
    console.error(`GET /feedback/event/${req.params.eventId} failed:`, err)
    res.status(500).json({ error: 'Failed to fetch feedback' })
  }
})

router.post('/', async (req: Request, res: Response) => {
  try {
    const feedback = await create(CONTAINER, req.body)
    res.status(201).json(feedback)
  } catch (err) {
    console.error('POST /feedback failed:', err)
    res.status(500).json({ error: 'Failed to create feedback' })
  }
})

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.body
    const feedback = await update(CONTAINER, req.params.id, req.body, eventId)
    res.json(feedback)
  } catch (err) {
    console.error(`PUT /feedback/${req.params.id} failed:`, err)
    res.status(500).json({ error: 'Failed to update feedback' })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const eventId = req.query.eventId as string
    if (!eventId) return res.status(400).json({ error: 'eventId query parameter required' })
    await remove(CONTAINER, req.params.id, eventId)
    res.status(204).send()
  } catch (err) {
    console.error(`DELETE /feedback/${req.params.id} failed:`, err)
    res.status(500).json({ error: 'Failed to delete feedback' })
  }
})

export default router
