
const key = 'AIzaSyDWjxUP4Clk5uYLJWNSzEbo43991Ja4dgQ';
const MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-pro',
  'gemini-1.5-flash-latest',
];
(async () => {
  for (const model of MODELS) {
    try {
      console.log('Trying model:', model);
      const res = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + key,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'test' }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 800
            }
          })
        }
      );

      if (res.status === 404) {
        console.log(model, 'not available, trying next...');
        continue;
      }

      if (!res.ok) {
        const err = await res.text();
        console.error(model, 'error:', res.status, err);
        continue;
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        console.log('Success with model:', model);
        return;
      }

    } catch (err) {
      console.error(model, 'failed:', err.message);
      continue;
    }
  }
})();

