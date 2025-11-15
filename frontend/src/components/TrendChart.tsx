import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend)

type Props = {
  counts: Record<string, number>
}

export default function TrendChart({ counts }: Props) {
  const labels = Object.keys(counts).sort()
  const data = {
    labels,
    datasets: [{
      label: '日频次',
      data: labels.map(d => counts[d] || 0),
      borderColor: '#2c7be5',
      backgroundColor: 'rgba(44,123,229,0.2)'
    }]
  }
  const options = {
    responsive: true,
    maintainAspectRatio: false
  } as const
  return <div style={{ height: 260 }}><Line data={data} options={options} /></div>
}

