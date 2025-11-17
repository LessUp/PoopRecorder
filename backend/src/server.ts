import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import { body, validationResult, query } from 'express-validator'
import { createEntry, listEntries, deleteAllForUser } from './repo'
import { authMiddleware, login, register } from './auth'

type Volume = 'small' | 'medium' | 'large'
type Color = 'brown' | 'dark_brown' | 'yellow' | 'green' | 'black' | 'red'

type StoolEntry = {
  id: string
  userId: string
  timestampMinute: string
  bristolType: 1 | 2 | 3 | 4 | 5 | 6 | 7
  smellScore: 1 | 2 | 3 | 4 | 5
  color: Color
  volume: Volume
  symptoms: string[]
  notes?: string
  createdAt: string
  updatedAt: string
  version: number
}

const app = express()

// Security middleware
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'too_many_requests', message: 'Too many requests from this IP' }
})
app.use(limiter)

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'too_many_auth_attempts', message: 'Too many authentication attempts' }
})

app.use(authMiddleware)

app.get('/health', (_, res) => {
  res.json({ 
    ok: true, 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  })
})

app.get('/entries', 
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
  (req: any, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'validation_error', 
        details: errors.array().map(e => ({ field: e.type === 'field' ? e.path : e.type, message: e.msg }))
      })
    }

    const userId = req.userId || req.headers['x-user-id'] as string || 'demo'
    if (!userId) {
      return res.status(401).json({ error: 'unauthorized', message: 'User ID is required' })
    }

    const limit = parseInt(req.query.limit as string) || 50
    const offset = parseInt(req.query.offset as string) || 0

    listEntries(userId)
      .then(rows => {
        const paginatedRows = rows.slice(offset, offset + limit)
        res.json({
          data: paginatedRows,
          pagination: {
            total: rows.length,
            limit,
            offset,
            hasMore: offset + limit < rows.length
          }
        })
      })
      .catch(error => {
        console.error('Error listing entries:', error)
        res.status(500).json({ 
          error: 'internal_error', 
          message: 'Failed to retrieve entries',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        })
      })
  })

app.post('/entries',
  body('timestampMinute').isISO8601().withMessage('Invalid timestamp format'),
  body('bristolType').isInt({ min: 1, max: 7 }).withMessage('Bristol type must be between 1 and 7'),
  body('smellScore').isInt({ min: 1, max: 5 }).withMessage('Smell score must be between 1 and 5'),
  body('color').isIn(['brown', 'dark_brown', 'yellow', 'green', 'black', 'red']).withMessage('Invalid color'),
  body('volume').isIn(['small', 'medium', 'large']).withMessage('Invalid volume'),
  body('symptoms').optional().isArray().withMessage('Symptoms must be an array'),
  body('notes').optional().isString().isLength({ max: 500 }).withMessage('Notes must be less than 500 characters'),
  (req: any, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'validation_error', 
        details: errors.array().map(e => ({ field: e.type === 'field' ? e.path : e.type, message: e.msg }))
      })
    }

    const userId = req.userId || req.headers['x-user-id'] as string || 'demo'
    if (!userId) {
      return res.status(401).json({ error: 'unauthorized', message: 'User ID is required' })
    }

    const body = req.body
    
    // Additional business logic validation
    const entryDate = new Date(body.timestampMinute)
    const now = new Date()
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    
    if (entryDate > now) {
      return res.status(400).json({ 
        error: 'invalid_date', 
        message: 'Entry date cannot be in the future' 
      })
    }
    
    if (entryDate < oneYearAgo) {
      return res.status(400).json({ 
        error: 'invalid_date', 
        message: 'Entry date cannot be more than one year ago' 
      })
    }

    createEntry(userId, body)
      .then(entry => res.status(201).json({ 
        success: true, 
        data: entry,
        message: 'Entry created successfully'
      }))
      .catch(error => {
        console.error('Error creating entry:', error)
        res.status(500).json({ 
          error: 'internal_error', 
          message: 'Failed to create entry',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        })
      })
  })

app.get('/analytics/frequency',
  query('period').isIn(['week', 'month', 'quarter', 'year']).withMessage('Invalid period'),
  query('startDate').optional().isISO8601().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date'),
  (req: any, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'validation_error', 
        details: errors.array().map(e => ({ field: e.type === 'field' ? e.path : e.type, message: e.msg }))
      })
    }

    const userId = req.userId || req.headers['x-user-id'] as string || 'demo'
    if (!userId) {
      return res.status(401).json({ error: 'unauthorized', message: 'User ID is required' })
    }

    const period = (req.query.period as string) || 'week'
    const startDate = req.query.startDate as string
    const endDate = req.query.endDate as string

    listEntries(userId)
      .then(data => {
        // Filter by date range if provided
        let filteredData = data
        if (startDate || endDate) {
          filteredData = data.filter(e => {
            const entryDate = new Date(e.timestampMinute)
            if (startDate && entryDate < new Date(startDate)) return false
            if (endDate && entryDate > new Date(endDate)) return false
            return true
          })
        }

        const counts: Record<string, number> = {}
        for (const e of filteredData) {
          const t = typeof e.timestampMinute === 'string' ? new Date(e.timestampMinute) : e.timestampMinute
          let key: string
          
          switch (period) {
            case 'week':
              key = new Date(t).toISOString().slice(0, 10) // daily
              break
            case 'month':
              key = new Date(t).toISOString().slice(0, 10) // daily
              break
            case 'quarter':
              key = new Date(t).toISOString().slice(0, 7) // monthly
              break
            case 'year':
              key = new Date(t).toISOString().slice(0, 7) // monthly
              break
            default:
              key = new Date(t).toISOString().slice(0, 10)
          }
          counts[key] = (counts[key] || 0) + 1
        }
        
        res.json({ 
          success: true,
          data: { period, counts },
          meta: {
            totalEntries: filteredData.length,
            dateRange: {
              start: startDate,
              end: endDate
            }
          }
        })
      })
      .catch(error => {
        console.error('Error calculating frequency:', error)
        res.status(500).json({ 
          error: 'internal_error', 
          message: 'Failed to calculate frequency',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        })
      })
  })

app.get('/analytics/score', (req: any, res) => {
  const userId = req.userId || req.headers['x-user-id'] as string || 'demo'
  if (!userId) {
    return res.status(401).json({ error: 'unauthorized', message: 'User ID is required' })
  }

  listEntries(userId)
    .then(rows => {
      const now = Date.now()
      const last30 = rows.filter(e => now - new Date(e.timestampMinute as any).getTime() < 30*24*3600_000)
      
      if (last30.length === 0) {
        return res.json({ 
          success: true,
          data: { score: null, message: 'Insufficient data for scoring' },
          meta: { entriesCount: 0 }
        })
      }

      const days = new Map<string, number>()
      for (const e of last30) {
        const d = new Date(e.timestampMinute as any).toISOString().slice(0,10)
        days.set(d, (days.get(d) || 0) + 1)
      }
      const freq = Array.from(days.values())
      const avg = freq.reduce((a,b)=>a+b,0) / (freq.length || 1)
      const variance = freq.reduce((a,b)=>a + (b-avg)*(b-avg), 0) / (freq.length || 1)
      const bristol = last30.map(e => e.bristolType)
      const median = bristol.sort((a,b)=>a-b)[Math.floor(bristol.length/2)] || 4
      const smellAvg = last30.reduce((a,e)=>a+e.smellScore,0) / (last30.length || 1)
      
      let score = 100
      score -= Math.min(40, variance*10)
      score -= Math.abs((median||4) - 4) * 10
      score -= Math.max(0, smellAvg - 3) * 10
      
      const finalScore = Math.max(0, Math.min(100, Math.round(score)))
      
      res.json({ 
        success: true,
        data: { 
          score: finalScore,
          breakdown: {
            frequencyVariance: Math.round(variance * 100) / 100,
            medianBristolType: median,
            averageSmellScore: Math.round(smellAvg * 100) / 100,
            entriesCount: last30.length
          }
        }
      })
    })
    .catch(error => {
      console.error('Error calculating score:', error)
      res.status(500).json({ 
        error: 'internal_error', 
        message: 'Failed to calculate health score',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    })
})

app.get('/alerts', (req: any, res) => {
  const userId = req.userId || req.headers['x-user-id'] as string || 'demo'
  if (!userId) {
    return res.status(401).json({ error: 'unauthorized', message: 'User ID is required' })
  }

  listEntries(userId)
    .then(rows => {
      const recent = rows.filter(e => Date.now() - new Date(e.timestampMinute as any).getTime() < 7*24*3600_000)
      const alerts = [] as { type: string; message: string; severity: 'low' | 'medium' | 'high'; timestamp: string }[]
      
      if (recent.length < 4) {
        alerts.push({ 
          type: 'constipation', 
          message: '最近一周记录较少，可能存在便秘风险',
          severity: 'medium',
          timestamp: new Date().toISOString()
        })
      }
      
      if (recent.filter(e => e.bristolType >= 6).length >= 3) {
        alerts.push({ 
          type: 'diarrhea', 
          message: '近期Bristol类型偏高，可能存在腹泻风险',
          severity: 'high',
          timestamp: new Date().toISOString()
        })
      }
      
      // Check for concerning symptoms
      const concerningSymptoms = recent.filter(e => 
        e.symptoms.some((s: string) => 
          ['blood', 'severe_pain', 'fever', 'vomiting'].includes(s.toLowerCase())
        )
      )
      
      if (concerningSymptoms.length > 0) {
        alerts.push({ 
          type: 'symptoms', 
          message: '检测到需要关注的症状，建议咨询医生',
          severity: 'high',
          timestamp: new Date().toISOString()
        })
      }
      
      res.json({ 
        success: true,
        data: alerts,
        meta: {
          recentEntriesCount: recent.length,
          alertsCount: alerts.length
        }
      })
    })
    .catch(error => {
      console.error('Error generating alerts:', error)
      res.status(500).json({ 
        error: 'internal_error', 
        message: 'Failed to generate alerts',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    })
})

app.post('/privacy/export', (req: any, res) => {
  const userId = req.userId || req.headers['x-user-id'] as string || 'demo'
  if (!userId) {
    return res.status(401).json({ error: 'unauthorized', message: 'User ID is required' })
  }

  listEntries(userId)
    .then(rows => {
      const exportData = {
        userId,
        exportDate: new Date().toISOString(),
        version: '1.0',
        entries: rows.map(entry => ({
          id: entry.id,
          timestampMinute: entry.timestampMinute,
          bristolType: entry.bristolType,
          smellScore: entry.smellScore,
          color: entry.color,
          volume: entry.volume,
          symptoms: entry.symptoms,
          notes: entry.notes,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
          version: entry.version
        }))
      }
      
      res.json({ 
        success: true,
        data: exportData,
        meta: {
          totalEntries: rows.length,
          exportSize: JSON.stringify(exportData).length
        }
      })
    })
    .catch(error => {
      console.error('Error exporting data:', error)
      res.status(500).json({ 
        error: 'internal_error', 
        message: 'Failed to export data',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    })
})

app.post('/privacy/delete', 
  body('confirmation').isString().equals('DELETE_MY_DATA').withMessage('Confirmation required'),
  (req: any, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'validation_error', 
        details: errors.array().map(e => ({ field: e.type === 'field' ? e.path : e.type, message: e.msg }))
      })
    }

    const userId = req.userId || req.headers['x-user-id'] as string || 'demo'
    if (!userId) {
      return res.status(401).json({ error: 'unauthorized', message: 'User ID is required' })
    }

    deleteAllForUser(userId)
      .then(() => {
        res.json({ 
          success: true,
          data: { 
            userId, 
            status: 'deleted',
            deletedAt: new Date().toISOString()
          },
          message: 'All data has been successfully deleted'
        })
      })
      .catch(error => {
        console.error('Error deleting data:', error)
        res.status(500).json({ 
          error: 'internal_error', 
          message: 'Failed to delete data',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        })
      })
  })

const port = process.env.PORT || 3001
if (require.main === module) {
  app.listen(port, () => {
    console.log(`API server listening on http://localhost:${port}`)
  })
}
export default app
app.post('/auth/register',
  authLimiter,
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase, and number'),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'validation_error', 
        details: errors.array().map(e => ({ field: e.type === 'field' ? e.path : e.type, message: e.msg }))
      })
    }

    try {
      const { email, password } = req.body
      const user = await register(email, password)
      res.status(201).json({ 
        success: true,
        data: { id: user.id, email: user.email },
        message: 'Registration successful'
      })
    } catch (error: any) {
      console.error('Registration error:', error)
      if (error.message?.includes('already exists') || error.code === 'P2002') {
        res.status(409).json({ 
          error: 'email_exists', 
          message: 'Email already registered'
        })
      } else {
        res.status(500).json({ 
          error: 'registration_failed', 
          message: 'Registration failed',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        })
      }
    }
  })

app.post('/auth/login',
  authLimiter,
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 1 }).withMessage('Password required'),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'validation_error', 
        details: errors.array().map(e => ({ field: e.type === 'field' ? e.path : e.type, message: e.msg }))
      })
    }

    try {
      const { email, password } = req.body
      const { token, user } = await login(email, password)
      res.json({ 
        success: true,
        data: { 
          token, 
          user: { id: user.id, email: user.email } 
        },
        message: 'Login successful'
      })
    } catch (error: any) {
      console.error('Login error:', error)
      if (error.message?.includes('invalid')) {
        res.status(401).json({ 
          error: 'invalid_credentials', 
          message: 'Invalid email or password'
        })
      } else {
        res.status(500).json({ 
          error: 'login_failed', 
          message: 'Login failed',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        })
      }
    }
  })
