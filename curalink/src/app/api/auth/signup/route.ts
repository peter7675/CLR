import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, userData } = body

    const supabase = await createClient()

    // Sign up the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'User creation failed' }, { status: 400 })
    }

    // Insert user data into users table
    const { error: dbError } = await supabase.from('users').insert({
      id: authData.user.id,
      email: authData.user.email,
      ...userData,
    })

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 400 })
    }

    return NextResponse.json({
      message: 'User created successfully',
      user: authData.user,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
