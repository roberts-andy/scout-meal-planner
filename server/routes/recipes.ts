import { Router, Request, Response } from 'express'
import { getAll, getById, create, update, remove } from '../cosmosdb'

const router = Router()
const CONTAINER = 'recipes'

router.get('/', async (_req: Request, res: Response) => {
  try {
    const recipes = await getAll(CONTAINER)
    res.json(recipes)
  } catch (err) {
    console.error('GET /recipes failed:', err)
    res.status(500).json({ error: 'Failed to fetch recipes' })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const recipe = await getById(CONTAINER, req.params.id)
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' })
    res.json(recipe)
  } catch (err) {
    console.error(`GET /recipes/${req.params.id} failed:`, err)
    res.status(500).json({ error: 'Failed to fetch recipe' })
  }
})

router.post('/', async (req: Request, res: Response) => {
  try {
    const recipe = await create(CONTAINER, req.body)
    res.status(201).json(recipe)
  } catch (err) {
    console.error('POST /recipes failed:', err)
    res.status(500).json({ error: 'Failed to create recipe' })
  }
})

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const recipe = await update(CONTAINER, req.params.id, req.body)
    res.json(recipe)
  } catch (err) {
    console.error(`PUT /recipes/${req.params.id} failed:`, err)
    res.status(500).json({ error: 'Failed to update recipe' })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await remove(CONTAINER, req.params.id)
    res.status(204).send()
  } catch (err) {
    console.error(`DELETE /recipes/${req.params.id} failed:`, err)
    res.status(500).json({ error: 'Failed to delete recipe' })
  }
})

export default router
