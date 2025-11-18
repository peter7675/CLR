import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get full user profile from users table
    const { data: userData, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 400 })
    }

    return NextResponse.json({ user: userData })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
