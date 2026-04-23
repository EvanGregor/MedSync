import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { prompt, context, provider } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // =========================
    // GEMINI PROVIDER
    // =========================
    if (provider === 'gemini') {
      const GEMINI_API_KEY =
        process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY

      if (!GEMINI_API_KEY) {
        return NextResponse.json(
          {
            error:
              'Gemini API key not configured. Set GEMINI_API_KEY (or NEXT_PUBLIC_GEMINI_API_KEY).',
          },
          { status: 500 }
        )
      }

      const fullPrompt = context
        ? `${context}\n\n${prompt}`
        : prompt

      // Smart model selection with modern-first fallback
      const isComplex =
        prompt.length > 300 ||
        /explain|why|how|analyze|compare/i.test(prompt)

      const models = isComplex
        ? ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash']
        : ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']

      let lastError: any = null

      for (const model of models) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`

          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [{ text: fullPrompt }]
                }
              ],
              generationConfig: {
                temperature: 0.7,
                topP: 0.9,
                maxOutputTokens: 1024
              }
            })
          })

          const data = await response.json()

          if (response.ok && !data.error) {
            const text =
              data?.candidates?.[0]?.content?.parts?.[0]?.text || ''

            return NextResponse.json({
              provider: 'gemini',
              model,
              text
            })
          }

          lastError =
            data?.error || {
              message: `Model ${model} failed (${response.status})`,
            }

          console.warn(`Gemini ${model} failed:`, lastError)
        } catch (err: any) {
          lastError = err
        }
      }

      return NextResponse.json(
        {
          error: {
            message: 'All Gemini models failed',
            details: lastError?.message || lastError || 'Unknown Gemini error',
          },
        },
        { status: 500 }
      )
    }

    // =========================
    // HUGGING FACE PROVIDER
    // =========================
    if (provider === 'huggingface') {
      const HF_API_KEY = process.env.HF_API_KEY

      const HF_API_URL =
        'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium'

      const fullPrompt = context
        ? `${context}\n\nUser: ${prompt}`
        : `User: ${prompt}`

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      if (HF_API_KEY) {
        headers['Authorization'] = `Bearer ${HF_API_KEY}`
      }

      const response = await fetch(HF_API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ inputs: fullPrompt })
      })

      const data = await response.json()

      return NextResponse.json({
        provider: 'huggingface',
        text:
          data?.generated_text ||
          data?.[0]?.generated_text ||
          JSON.stringify(data)
      })
    }

    // =========================
    // INVALID PROVIDER
    // =========================
    return NextResponse.json(
      { error: 'Invalid provider' },
      { status: 400 }
    )
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}