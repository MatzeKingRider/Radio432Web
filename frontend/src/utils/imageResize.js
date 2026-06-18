// Skaliert ein hochgeladenes Bild herunter (max. Kantenlänge) und gibt eine
// JPEG-DataURL zurück. Verhindert, dass große Hintergrundbilder das
// localStorage-Limit sprengen.
export function fileToDownscaledDataURL(file, maxEdge = 1600, quality = 0.8) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Keine Bilddatei'))
      return
    }
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Bild konnte nicht geladen werden'))
      img.onload = () => {
        let { width, height } = img
        const scale = Math.min(1, maxEdge / Math.max(width, height))
        width = Math.round(width * scale)
        height = Math.round(height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        try {
          resolve(canvas.toDataURL('image/jpeg', quality))
        } catch (e) {
          reject(e)
        }
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}
