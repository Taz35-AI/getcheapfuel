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
    join(process.cwd(), 'public', 'icons', 'logo.png')
  )
  const logoSrc = Uint8Array.from(logoData).buffer

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
          background: '#111827',
          fontFamily: 'sans-serif',
        }}
      >
        {/* @ts-expect-error Satori accepts ArrayBuffer for img src */}
        <img src={logoSrc} width="400" style={{ marginBottom: 32 }} />
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: '#ffffff',
            textAlign: 'center',
            lineHeight: 1.2,
            maxWidth: 950,
          }}
        >
          Cheap Petrol, Diesel &
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: '#22c55e',
            textAlign: 'center',
            lineHeight: 1.2,
          }}
        >
          EV Charging Prices
        </div>
        <div
          style={{
            fontSize: 28,
            color: '#9ca3af',
            fontWeight: 500,
            marginTop: 24,
          }}
        >
          Real data from 7,500+ UK stations
        </div>
        <div
          style={{
            fontSize: 22,
            color: '#4b5563',
            marginTop: 16,
            padding: '8px 24px',
            border: '2px solid #374151',
            borderRadius: 100,
          }}
        >
          getcheapfuel.co.uk
        </div>
      </div>
    ),
    { ...size }
  )
}
