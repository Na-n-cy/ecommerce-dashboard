const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY

const MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-pro',
  'gemini-1.5-flash-latest',
]

export async function callGemini(prompt) {
  if (!GEMINI_API_KEY) {
    console.error('VITE_GEMINI_API_KEY missing')
    return null
  }

  for (const model of MODELS) {
    try {
      console.log('Trying model:', model)
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 800
            }
          })
        }
      )

      if (res.status === 404) {
        console.log(model, 'not available, trying next...')
        continue
      }

      if (!res.ok) {
        const err = await res.text()
        console.error(model, 'error:', res.status, err)
        continue
      }

      const data = await res.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (text) {
        console.log('Success with model:', model)
        return text
      }

    } catch (err) {
      console.error(model, 'failed:', err.message)
      continue
    }
  }

  console.error('All Gemini models failed')
  return null
}
