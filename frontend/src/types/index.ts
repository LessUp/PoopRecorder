export type Volume = 'small' | 'medium' | 'large'
export type Color = 'brown' | 'dark_brown' | 'yellow' | 'green' | 'black' | 'red'
export type Symptom = 'bloating' | 'abdominal_pain' | 'nausea' | 'urgency' | 'constipation'

export type StoolEntry = {
  id: string
  timestampMinute: string
  bristolType: 1 | 2 | 3 | 4 | 5 | 6 | 7
  smellScore: 1 | 2 | 3 | 4 | 5
  color: Color
  volume: Volume
  symptoms: Symptom[]
  notes?: string
}
