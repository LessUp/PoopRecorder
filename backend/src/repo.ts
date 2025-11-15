import { PrismaClient } from '@prisma/client'

type Volume = 'small' | 'medium' | 'large'
type Color = 'brown' | 'dark_brown' | 'yellow' | 'green' | 'black' | 'red'

export type StoolEntryInput = {
  timestampMinute: string
  bristolType: number
  smellScore: number
  color: Color
  volume: Volume
  symptoms: string[]
  notes?: string
}

const prisma = new PrismaClient()
let memory: any[] = []

export async function listEntries(userId: string) {
  try {
    return await prisma.stoolEntry.findMany({ where: { userId }, orderBy: { timestampMinute: 'desc' } })
  } catch {
    return memory.filter(e => e.userId === userId)
  }
}

export async function createEntry(userId: string, body: StoolEntryInput) {
  const data = {
    userId,
    timestampMinute: new Date(body.timestampMinute),
    bristolType: body.bristolType,
    smellScore: body.smellScore,
    color: body.color as any,
    volume: body.volume as any,
    symptoms: body.symptoms,
    notes: body.notes,
    version: 1
  }
  try {
    return await prisma.stoolEntry.create({ data })
  } catch {
    const now = new Date().toISOString()
    const entry = { id: Math.random().toString(36).slice(2), createdAt: now, updatedAt: now, ...data, timestampMinute: body.timestampMinute }
    memory.unshift(entry)
    return entry
  }
}

export async function deleteAllForUser(userId: string) {
  try {
    await prisma.stoolEntry.deleteMany({ where: { userId } })
    return true
  } catch {
    memory = memory.filter(e => e.userId !== userId)
    return true
  }
}

