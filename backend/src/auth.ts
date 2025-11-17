import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { body, validationResult } from 'express-validator'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret'
const memoryUsers: Array<{ id: string; email: string; passwordHash: string }> = []

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_MIN_LENGTH = 8
const PASSWORD_MAX_LENGTH = 128

export async function register(email: string, password: string) {
  // Input validation
  if (!email || !password) {
    throw new Error('Email and password are required')
  }
  
  if (!EMAIL_REGEX.test(email)) {
    throw new Error('Invalid email format')
  }
  
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    throw new Error(`Password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters`)
  }
  
  // Check for common password patterns
  const commonPatterns = ['123456', 'password', 'qwerty', 'admin', 'letmein']
  if (commonPatterns.some(pattern => password.toLowerCase().includes(pattern))) {
    throw new Error('Password is too common, please choose a stronger password')
  }

  const hash = await bcrypt.hash(password, 12) // Increased salt rounds for better security
  
  try {
    const user = await prisma.user.create({ 
      data: { 
        email: email.toLowerCase().trim(), 
        passwordHash: hash, 
        provider: 'local', 
        status: 'active' 
      } 
    })
    return user
  } catch (error: any) {
    // Handle unique constraint violations
    if (error.code === 'P2002') {
      throw new Error('Email already exists')
    }
    
    // Fallback to memory storage for demo purposes
    const id = Math.random().toString(36).slice(2)
    const existingUser = memoryUsers.find(u => u.email === email.toLowerCase().trim())
    if (existingUser) {
      throw new Error('Email already exists')
    }
    
    memoryUsers.push({ 
      id, 
      email: email.toLowerCase().trim(), 
      passwordHash: hash 
    })
    return { id, email: email.toLowerCase().trim(), passwordHash: hash } as any
  }
}

export async function login(email: string, password: string) {
  // Input validation
  if (!email || !password) {
    throw new Error('Email and password are required')
  }
  
  if (!EMAIL_REGEX.test(email)) {
    throw new Error('Invalid email format')
  }

  let user: any
  try {
    user = await prisma.user.findUnique({ 
      where: { email: email.toLowerCase().trim() } 
    })
  } catch (error) {
    // Fallback to memory storage
    user = memoryUsers.find(u => u.email === email.toLowerCase().trim())
  }
  
  if (!user || !user.passwordHash) {
    throw new Error('invalid')
  }
  
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) {
    throw new Error('invalid')
  }
  
  // Check if account is active
  if (user.status && user.status !== 'active') {
    throw new Error('Account is not active')
  }
  
  const token = jwt.sign(
    { 
      sub: user.id, 
      email: user.email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (2 * 60 * 60) // 2 hours
    }, 
    JWT_SECRET, 
    { 
      algorithm: 'HS256',
      issuer: 'poop-recorder-api',
      audience: 'poop-recorder-app'
    }
  )
  
  return { token, user }
}

export function authMiddleware(req: any, res: any, next: any) {
  const h = req.headers['authorization'] as string
  
  if (h && h.startsWith('Bearer ')) {
    try {
      const token = h.slice(7)
      
      // Verify token structure
      if (!token || token.split('.').length !== 3) {
        throw new Error('Invalid token format')
      }
      
      const decoded = jwt.verify(token, JWT_SECRET, {
        algorithms: ['HS256'],
        issuer: 'poop-recorder-api',
        audience: 'poop-recorder-app'
      }) as any
      
      // Additional validation
      if (!decoded.sub || !decoded.email) {
        throw new Error('Invalid token payload')
      }
      
      req.userId = decoded.sub
      req.userEmail = decoded.email
      req.tokenPayload = decoded
    } catch (error: any) {
      // Log authentication errors for monitoring
      console.warn('Authentication failed:', error.message)
      // Continue without setting user info, let route handlers decide
    }
  }
  
  next()
}

// Strict authentication middleware that requires valid token
export function requireAuth(req: any, res: any, next: any) {
  if (!req.userId) {
    return res.status(401).json({ 
      error: 'unauthorized', 
      message: 'Valid authentication token required' 
    })
  }
  next()
}