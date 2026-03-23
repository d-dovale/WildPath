import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import swaggerUi from 'swagger-ui-express'
import YAML from 'yamljs'
import animalsRouter from './routes/animals'
import { errorHandler } from './middleware/errorHandler'

const app = express()
const PORT = process.env.PORT ?? 3001
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173'
const openapiPath = path.resolve(process.cwd(), 'openapi.yaml')
const openapiDocument = YAML.load(openapiPath)

app.use(cors({ origin: FRONTEND_ORIGIN }))
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDocument))
app.use('/api/animals', animalsRouter)

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`WildPath API running on http://localhost:${PORT}`)
})
