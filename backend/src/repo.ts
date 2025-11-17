import { PrismaClient } from '@prisma/client'

// Validation constants
const VALID_COLORS = ['brown', 'dark_brown', 'yellow', 'green', 'black', 'red'] as const
const VALID_VOLUMES = ['small', 'medium', 'large'] as const
const VALID_BRISTOL_TYPES = [1, 2, 3, 4, 5, 6, 7] as const
const VALID_SMELL_SCORES = [1, 2, 3, 4, 5] as const

type Volume = 'small' | 'medium' | 'large'
type Color = 'brown' | 'dark_brown' | 'yellow' | 'green' | 'black' | 'red'

export type StoolEntryInput = {
  timestampMinute: string
  bristolType: 1 | 2 | 3 | 4 | 5 | 6 | 7
  smellScore: 1 | 2 | 3 | 4 | 5
  color: Color
  volume: Volume
  symptoms: string[]
  notes?: string
}

const prisma = new PrismaClient()
let memory: any[] = []

// Validation helper functions
function validateStoolEntryInput(input: any): void {
  if (!input.timestampMinute || !Date.parse(input.timestampMinute)) {
    throw new Error('Valid timestampMinute is required')
  }
  
  if (!VALID_BRISTOL_TYPES.includes(input.bristolType)) {
    throw new Error(`bristolType must be one of: ${VALID_BRISTOL_TYPES.join(', ')}`)
  }
  
  if (!VALID_SMELL_SCORES.includes(input.smellScore)) {
    throw new Error(`smellScore must be one of: ${VALID_SMELL_SCORES.join(', ')}`)
  }
  
  if (!VALID_COLORS.includes(input.color)) {
    throw new Error(`color must be one of: ${VALID_COLORS.join(', ')}`)
  }
  
  if (!VALID_VOLUMES.includes(input.volume)) {
    throw new Error(`volume must be one of: ${VALID_VOLUMES.join(', ')}`)
  }
  
  if (!Array.isArray(input.symptoms)) {
    throw new Error('symptoms must be an array')
  }
  
  // Validate each symptom
  input.symptoms.forEach((symptom: string) => {
    if (typeof symptom !== 'string' || symptom.length > 50) {
      throw new Error('Each symptom must be a string with max 50 characters')
    }
  })
  
  if (input.notes && (typeof input.notes !== 'string' || input.notes.length > 500)) {
    throw new Error('notes must be a string with max 500 characters')
  }
}

export async function listEntries(userId: string) {
  if (!userId || typeof userId !== 'string') {
    throw new Error('Valid userId is required')
  }
  
  try {
    return await prisma.stoolEntry.findMany({ 
      where: { userId }, 
      orderBy: { timestampMinute: 'desc' } 
    })
  } catch (error) {
    console.warn('Database error, falling back to memory storage:', error)
    return memory.filter(e => e.userId === userId)
  }
}

export async function createEntry(userId: string, body: StoolEntryInput) {
  if (!userId || typeof userId !== 'string') {
    throw new Error('Valid userId is required')
  }
  
  // Validate input
  validateStoolEntryInput(body)
  
  const data = {
    userId,
    timestampMinute: new Date(body.timestampMinute),
    bristolType: body.bristolType,
    smellScore: body.smellScore,
    color: body.color,
    volume: body.volume,
    symptoms: body.symptoms,
    notes: body.notes,
    version: 1
  }
  
  try {
    return await prisma.stoolEntry.create({ data })
  } catch (error) {
    console.warn('Database error, falling back to memory storage:', error)
    const now = new Date().toISOString()
    const entry = { 
      id: Math.random().toString(36).slice(2), 
      createdAt: now, 
      updatedAt: now, 
      ...data, 
      timestampMinute: body.timestampMinute 
    }
    memory.unshift(entry)
    return entry
  }
}

export async function deleteAllForUser(userId: string) {
  if (!userId || typeof userId !== 'string') {
    throw new Error('Valid userId is required')
  }
  
  try {
    const result = await prisma.stoolEntry.deleteMany({ where: { userId } })
    return result.count > 0
  } catch (error) {
    console.warn('Database error, falling back to memory storage:', error)
    const initialLength = memory.length
    memory = memory.filter(e => e.userId !== userId)
    return memory.length < initialLength
  }
}

