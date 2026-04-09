import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const alt = 'GetCheapFuel - Compare Cheap Petrol, Diesel & EV Charging Prices UK'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  const logoData = await readFile(
    join(process.cwd(), 'public', 'icons', 'logo.png'),
    'base64'
  )
  const logoSrc = `data:image/png;base64,${logoData}`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #bbf7d0 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <img src={logoSrc} height="120" style={{ marginBottom: 30 }} />
        <div
          style={{
            fontSize: 48,
            fontWeight: 800,
            color: '#111827',
            textAlign: 'center',
            lineHeight: 1.2,
            maxWidth: 900,
          }}
        >
          Compare Cheap Petrol, Diesel
        </div>
        <div
          style={{
            fontSize: 48,
            fontWeight: 800,
            color: '#111827',
            textAlign: 'center',
            lineHeight: 1.2,
          }}
        >
          & EV Charging Prices
        </div>
        <div
          style={{
            fontSize: 24,
            color: '#16a34a',
            fontWeight: 600,
            marginTop: 20,
          }}
        >
          Real data from 7,500+ UK stations
        </div>
        <div
          style={{
            fontSize: 20,
            color: '#6b7280',
            marginTop: 12,
          }}
        >
          getcheapfuel.co.uk
        </div>
      </div>
    ),
    { ...size }
  )
}
