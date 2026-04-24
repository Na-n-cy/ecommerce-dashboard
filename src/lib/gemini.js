const KEY = import.meta.env.VITE_GEMINI_API_KEY

export async function callGemini(prompt) {
  console.log('=== GEMINI DEBUG ===')
  console.log('Key defined:', !!KEY)
  console.log('Key preview:', KEY ? KEY.slice(0, 15) + '...' : 'MISSING')
  console.log('Key length:', KEY?.length)

  if (!KEY || KEY === 'undefined' || KEY.length < 20) {
    console.error('KEY INVALID - Check Vercel environment variables')
    return null
  }

  const models = [
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash',
    'gemini-1.5-pro'
  ]

  for (const model of models) {
    try {
      console.log('Trying model:', model)
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 600 }
          })
        }
      )
      console.log(model, '→ status:', res.status)
      if (res.status === 404 || res.status === 429) { continue }
      if (!res.ok) { continue }
      const data = await res.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (text) {
        console.log('SUCCESS:', model)
        return text.trim()
      }
    } catch (err) {
      console.error(model, 'error:', err.message)
    }
  }
  console.error('ALL MODELS FAILED')
  return null
}
