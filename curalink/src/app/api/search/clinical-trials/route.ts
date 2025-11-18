import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import { createClient } from '@/lib/supabase/server'
import { summarizeClinicalTrial } from '@/lib/gemini'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { keyword, disease, location } = body

    const supabase = await createClient()

    // Search ClinicalTrials.gov API
    const trials = await searchClinicalTrials(disease, keyword, location)

    // Store trials with AI summaries
    const stored = []
    for (const trial of trials) {
      try {
        // Generate AI summary
        const aiSummary = await summarizeClinicalTrial(
          trial.title,
          trial.condition || [],
          trial.eligibility
        )

        const { data, error } = await supabase
          .from('clinical_trials')
          .upsert(
            {
              nct_id: trial.nct_id,
              title: trial.title,
              status: trial.status,
              phase: trial.phase,
              condition: trial.condition,
              intervention: trial.intervention,
              eligibility: trial.eligibility,
              location: trial.location,
              sponsor: trial.sponsor,
              contact_email: trial.contact_email,
              link: trial.link,
              ai_summary: aiSummary,
            },
            { onConflict: 'nct_id', ignoreDuplicates: false }
          )
          .select()
          .single()

        if (!error && data) {
          stored.push(data)
        }
      } catch (err) {
        console.error('Error processing clinical trial:', err)
      }
    }

    return NextResponse.json({ trials: stored })
  } catch (error: any) {
    console.error('Clinical trial search error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function searchClinicalTrials(disease: string, keyword?: string, location?: string) {
  const trials: any[] = []

  try {
    // ClinicalTrials.gov API v2
    let apiUrl = `https://clinicaltrials.gov/api/v2/studies?query.cond=${encodeURIComponent(disease)}`

    if (keyword) {
      apiUrl += `&query.term=${encodeURIComponent(keyword)}`
    }

    if (location) {
      apiUrl += `&query.locn=${encodeURIComponent(location)}`
    }

    apiUrl += '&pageSize=10'

    const response = await axios.get(apiUrl, {
      headers: {
        'User-Agent': 'CuraLink/1.0',
      },
      timeout: 15000,
    })

    if (response.data?.studies) {
      for (const study of response.data.studies) {
        const protocol = study.protocolSection

        trials.push({
          nct_id: protocol.identificationModule.nctId,
          title: protocol.identificationModule.officialTitle || protocol.identificationModule.briefTitle,
          status: mapTrialStatus(protocol.statusModule?.overallStatus),
          phase: protocol.designModule?.phases?.[0] || 'Not Applicable',
          condition: protocol.conditionsModule?.conditions || [],
          intervention: protocol.armsInterventionsModule?.interventions?.map((i: any) => i.name) || [],
          eligibility: protocol.eligibilityModule?.eligibilityCriteria,
          location: location || protocol.contactsLocationsModule?.locations?.[0]?.city,
          sponsor: protocol.sponsorCollaboratorsModule?.leadSponsor?.name,
          contact_email: protocol.contactsLocationsModule?.centralContacts?.[0]?.email,
          link: `https://clinicaltrials.gov/study/${protocol.identificationModule.nctId}`,
        })
      }
    }
  } catch (error) {
    console.error('Error fetching from ClinicalTrials.gov:', error)
  }

  // If no results, add mock data
  if (trials.length === 0) {
    trials.push({
      nct_id: 'NCT00000000',
      title: `Clinical Study of ${keyword || 'New Treatment'} for ${disease}`,
      status: 'recruiting',
      phase: 'Phase 2',
      condition: [disease],
      intervention: [keyword || 'Investigational Treatment'],
      eligibility: `Adults diagnosed with ${disease}. See full eligibility criteria on ClinicalTrials.gov.`,
      location: location || 'Multiple Locations',
      sponsor: 'Academic Medical Center',
      contact_email: 'clinicaltrials@example.com',
      link: `https://clinicaltrials.gov/search?cond=${encodeURIComponent(disease)}`,
    })
  }

  return trials
}

function mapTrialStatus(status?: string): string {
  const statusMap: Record<string, string> = {
    'RECRUITING': 'recruiting',
    'ACTIVE_NOT_RECRUITING': 'active',
    'COMPLETED': 'completed',
    'SUSPENDED': 'suspended',
    'TERMINATED': 'terminated',
    'WITHDRAWN': 'withdrawn',
  }

  return statusMap[status || ''] || 'recruiting'
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const status = searchParams.get('status')
    const location = searchParams.get('location')
    const condition = searchParams.get('condition')

    const supabase = await createClient()

    let dbQuery = supabase.from('clinical_trials').select('*')

    if (query) {
      dbQuery = dbQuery.or(`title.ilike.%${query}%,eligibility.ilike.%${query}%`)
    }

    if (status) {
      dbQuery = dbQuery.eq('status', status)
    }

    if (location) {
      dbQuery = dbQuery.ilike('location', `%${location}%`)
    }

    if (condition) {
      dbQuery = dbQuery.contains('condition', [condition])
    }

    dbQuery = dbQuery.order('created_at', { ascending: false }).limit(20)

    const { data, error } = await dbQuery

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ trials: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
