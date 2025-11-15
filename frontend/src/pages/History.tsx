import { useEffect, useState } from 'react'
import { listEntries } from '../idb'

export default function History() {
  const [entries, setEntries] = useState<any[]>([])
  useEffect(() => { listEntries().then(setEntries) }, [])
  return (
    <div>
      <h2>历史记录</h2>
      <ul>
        {entries.map(e => (
          <li key={e.id}>{e.timestampMinute} | Bristol {e.bristolType} | 气味 {e.smellScore} | {e.color} | {e.volume}</li>
        ))}
      </ul>
    </div>
  )
}