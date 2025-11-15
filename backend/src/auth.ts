import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret'
const memoryUsers: Array<{ id: string; email: string; passwordHash: string }> = []

export async function register(email: string, password: string) {
  const hash = await bcrypt.hash(password, 10)
  try {
    const user = await prisma.user.create({ data: { email, passwordHash: hash, provider: 'local', status: 'active' } })
    return user
  } catch {
    const id = Math.random().toString(36).slice(2)
    memoryUsers.push({ id, email, passwordHash: hash })
    return { id, email, passwordHash: hash } as any
  }
}

export async function login(email: string, password: string) {
  let user: any
  try {
    user = await prisma.user.findUnique({ where: { email } })
  } catch {
    user = memoryUsers.find(u => u.email === email)
  }
  if (!user || !user.passwordHash) throw new Error('invalid')
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) throw new Error('invalid')
  const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '2h' })
  return { token, user }
}

export function authMiddleware(req: any, _res: any, next: any) {
  const h = req.headers['authorization'] as string
  if (h && h.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(h.slice(7), JWT_SECRET) as any
      req.userId = decoded.sub
    } catch {}
  }
  next()
}