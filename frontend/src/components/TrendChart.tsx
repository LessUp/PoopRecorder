import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend, Filler)

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
      borderColor: '#2563eb', // blue-600
      backgroundColor: 'rgba(37, 99, 235, 0.1)', // blue-600 with opacity
      fill: true,
      tension: 0.4, // Smooth curve
      pointBackgroundColor: '#ffffff',
      pointBorderColor: '#2563eb',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
    }]
  }
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: '#1f2937', // gray-800
        padding: 12,
        titleFont: { size: 13 },
        bodyFont: { size: 13 },
        cornerRadius: 8,
        displayColors: false,
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: { size: 11 },
          color: '#6b7280' // gray-500
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
          borderDash: [4, 4]
        },
        ticks: {
          stepSize: 1,
          font: { size: 11 },
          color: '#6b7280' // gray-500
        }
      }
    }
  } as const

  return <div style={{ height: '100%', minHeight: 260 }}><Line data={data} options={options} /></div>
}


