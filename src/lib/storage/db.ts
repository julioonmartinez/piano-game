import type { HighScore } from '$lib/game/types'

const DB_NAME = 'piano-tiles'
const DB_VERSION = 1
const STORE_HIGH_SCORES = 'highscores'

export interface HighScoreMap {
  [songId: string]: HighScore
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_HIGH_SCORES)) {
        const store = db.createObjectStore(STORE_HIGH_SCORES, { keyPath: 'songId' })
        store.createIndex('score', 'score', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function loadHighScores(): Promise<HighScoreMap> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_HIGH_SCORES, 'readonly')
    const store = tx.objectStore(STORE_HIGH_SCORES)
    const req = store.getAll()
    return new Promise((resolve) => {
      req.onsuccess = () => {
        const map: HighScoreMap = {}
        for (const hs of req.result as HighScore[]) {
          map[hs.songId] = hs
        }
        resolve(map)
      }
      req.onerror = () => resolve({})
    })
  } catch {
    return {}
  }
}

export async function saveHighScore(score: HighScore): Promise<void> {
  try {
    const db = await openDB()
    const existing = await loadHighScores()
    const prev = existing[score.songId]
    if (prev && prev.score >= score.score) return

    const tx = db.transaction(STORE_HIGH_SCORES, 'readwrite')
    const store = tx.objectStore(STORE_HIGH_SCORES)
    store.put(score)
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // silent
  }
}
