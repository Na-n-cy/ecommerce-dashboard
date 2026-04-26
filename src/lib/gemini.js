const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY

export async function callGemini(prompt) {
  console.log('Groq called. Key exists:', !!GROQ_API_KEY)

  if (!GROQ_API_KEY || GROQ_API_KEY.length < 10) {
    console.error('VITE_GROQ_API_KEY missing. Add it to .env and Vercel environment variables.')
    return null
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          {
            role: 'system',
            content: 'You are a business advisor for an e-commerce store owner. Always give exactly 3 practical recommendations numbered 1, 2, 3. Each on its own line. No asterisks. No markdown. Plain text only. Maximum 25 words per point.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    })

    console.log('Groq status:', response.status)

    if (!response.ok) {
      const err = await response.text()
      console.error('Groq error:', response.status, err)
      return null
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content

    if (text && text.trim().length > 0) {
      console.log('Groq success. Preview:', text.slice(0, 80))
      return text.trim()
    }

    return null

  } catch (err) {
    console.error('Groq fetch failed:', err.message)
    return null
  }
}
