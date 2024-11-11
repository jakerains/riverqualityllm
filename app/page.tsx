import dynamic from 'next/dynamic'

const QualityControlApp = dynamic(() => import('@/components/quality-control-app'), { ssr: false })

export default function Home() {
  return (
    <main>
      <QualityControlApp />
    </main>
  )
}