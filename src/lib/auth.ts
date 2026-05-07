import bcrypt from 'bcrypt'
import { SignJWT, jwtVerify } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET || 'pitchbook-jwt-secret-2025-change-me'
const secretKey = new TextEncoder().encode(JWT_SECRET)

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createSessionToken(userId: string, role: string): Promise<string> {
  const token = await new SignJWT({ userId, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(secretKey)
  return token
}

export async function parseSessionToken(token: string): Promise<{ userId: string; role: string; exp: number } | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey)
    const { userId, role, exp } = payload
    if (typeof userId !== 'string' || typeof role !== 'string' || typeof exp !== 'number') {
      return null
    }
    return { userId, role, exp }
  } catch {
    return null
  }
}
