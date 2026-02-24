import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import animalsRouter from './routes/animals'
import { errorHandler } from './middleware/errorHandler'

const app = express()
const PORT = process.env.PORT ?? 3001
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173'

app.use(cors({ origin: FRONTEND_ORIGIN }))
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/animals', animalsRouter)

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`WildPath API running on http://localhost:${PORT}`)
})
