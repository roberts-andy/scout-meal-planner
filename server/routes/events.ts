import { Router, Request, Response } from 'express'
import { getAll, getById, create, update, remove } from '../cosmosdb'

const router = Router()
const CONTAINER = 'events'

router.get('/', async (_req: Request, res: Response) => {
  try {
    const events = await getAll(CONTAINER)
    res.json(events)
  } catch (err) {
    console.error('GET /events failed:', err)
    res.status(500).json({ error: 'Failed to fetch events' })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const event = await getById(CONTAINER, req.params.id)
    if (!event) return res.status(404).json({ error: 'Event not found' })
    res.json(event)
  } catch (err) {
    console.error(`GET /events/${req.params.id} failed:`, err)
    res.status(500).json({ error: 'Failed to fetch event' })
  }
})

router.post('/', async (req: Request, res: Response) => {
  try {
    const event = await create(CONTAINER, req.body)
    res.status(201).json(event)
  } catch (err) {
    console.error('POST /events failed:', err)
    res.status(500).json({ error: 'Failed to create event' })
  }
})

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const event = await update(CONTAINER, req.params.id, req.body)
    res.json(event)
  } catch (err) {
    console.error(`PUT /events/${req.params.id} failed:`, err)
    res.status(500).json({ error: 'Failed to update event' })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await remove(CONTAINER, req.params.id)
    res.status(204).send()
  } catch (err) {
    console.error(`DELETE /events/${req.params.id} failed:`, err)
    res.status(500).json({ error: 'Failed to delete event' })
  }
})

export default router
