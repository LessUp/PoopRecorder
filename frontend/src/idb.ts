import { openDB } from 'idb'

const DB_NAME = 'poop-recorder'
const DB_VERSION = 1

export async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('entries')) db.createObjectStore('entries', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('queue')) db.createObjectStore('queue', { keyPath: 'id' })
    }
  })
}

export async function addEntry(entry: any) {
  const db = await getDB()
  await db.put('entries', entry)
}

export async function listEntries() {
  const db = await getDB()
  return await db.getAll('entries')
}

export async function addQueue(item: any) {
  const db = await getDB()
  await db.put('queue', item)
}

export async function drainQueue(send: (payload: any) => Promise<void>) {
  const db = await getDB()
  const items = await db.getAll('queue')
  for (const it of items) {
    try {
      await send(it.payload)
      await db.delete('queue', it.id)
    } catch {}
  }
}