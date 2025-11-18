import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function extractDisease(text: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

  const prompt = `Extract the primary disease or medical condition from this text. Return only the disease name, nothing else: "${text}"`

  const result = await model.generateContent(prompt)
  const response = result.response
  return response.text().trim()
}

export async function generateKeywords(disease: string, context?: string): Promise<string[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

  const prompt = `Generate 5-7 relevant medical research keywords for "${disease}"${context ? ` in the context of: ${context}` : ''}. Return only comma-separated keywords.`

  const result = await model.generateContent(prompt)
  const response = result.response
  const keywords = response.text().split(',').map(k => k.trim())

  return keywords
}

export async function summarizePublication(title: string, abstract?: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

  const prompt = `Summarize this research publication in 2-3 concise sentences for a patient audience:
Title: ${title}
${abstract ? `Abstract: ${abstract}` : ''}`

  const result = await model.generateContent(prompt)
  const response = result.response
  return response.text().trim()
}

export async function summarizeClinicalTrial(
  title: string,
  condition: string[],
  eligibility?: string
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

  const prompt = `Summarize this clinical trial in 2-3 concise sentences for a patient:
Title: ${title}
Conditions: ${condition.join(', ')}
${eligibility ? `Eligibility: ${eligibility}` : ''}`

  const result = await model.generateContent(prompt)
  const response = result.response
  return response.text().trim()
}

export async function enhanceSearchQuery(query: string, disease: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

  const prompt = `Enhance this medical search query by combining it with the disease context. Return only the enhanced query:
Query: ${query}
Disease: ${disease}`

  const result = await model.generateContent(prompt)
  const response = result.response
  return response.text().trim()
}
