import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import swaggerUi from 'swagger-ui-express'
import yaml from 'js-yaml'
import speciesRouter from './routes/species'
import sightingsRouter from './routes/sightings'
import insightsRouter from './routes/insights'
import { errorHandler } from './middleware/errorHandler'

const app = express()
const PORT = process.env.PORT ?? 3001
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173'
const ENABLE_SWAGGER_DOCS = process.env.ENABLE_SWAGGER_DOCS === 'true'

app.use(cors({ origin: FRONTEND_ORIGIN }))
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

if (ENABLE_SWAGGER_DOCS) {
  // Resolve relative to this source file so the path is stable regardless
  // of the working directory the server is started from.
  const openapiPath = path.resolve(__dirname, '..', 'openapi.yaml')
  try {
    const openapiDocument = yaml.load(fs.readFileSync(openapiPath, 'utf8'))
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDocument as object))
    console.log(`Swagger UI available at http://localhost:${PORT}/docs`)
  } catch (err) {
    console.warn('[WildPath] WARNING: Could not load openapi.yaml — Swagger UI disabled.', err)
  }
}

app.use('/api/species', speciesRouter)
app.use('/api/sightings', sightingsRouter)
app.use('/api/insights', insightsRouter)

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`WildPath API running on http://localhost:${PORT}`)
})
