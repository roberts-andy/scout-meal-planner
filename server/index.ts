import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { initDatabase } from './cosmosdb'
import eventsRouter from './routes/events'
import recipesRouter from './routes/recipes'
import feedbackRouter from './routes/feedback'

const app = express()
const PORT = process.env.API_PORT || 3001

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }))
app.use(express.json({ limit: '1mb' }))

app.use('/api/events', eventsRouter)
app.use('/api/recipes', recipesRouter)
app.use('/api/feedback', feedbackRouter)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

async function start() {
  try {
    await initDatabase()
    app.listen(PORT, () => {
      console.log(`API server running on http://localhost:${PORT}`)
    })
  } catch (err) {
    console.error('Failed to start server:', err)
    process.exit(1)
  }
}

start()
