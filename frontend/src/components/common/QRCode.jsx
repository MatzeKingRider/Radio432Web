import { useEffect, useRef } from 'react'
import QRCodeLib from 'qrcode'

// Rendert einen QR-Code für beliebigen Text auf ein Canvas (Lib: qrcode).
export default function QRCode({ text, size = 256, margin = 2, dark = '#000000', light = '#ffffff' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!text || !canvasRef.current) return
    QRCodeLib.toCanvas(
      canvasRef.current,
      text,
      {
        width: size,
        margin,
        errorCorrectionLevel: 'M',
        color: { dark, light },
      },
      (err) => {
        if (err) console.error('QR-Code Rendering fehlgeschlagen:', err)
      }
    )
  }, [text, size, margin, dark, light])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size, borderRadius: 8 }}
      aria-label="QR-Code zum Verbinden mit der iOS-App"
      role="img"
    />
  )
}
