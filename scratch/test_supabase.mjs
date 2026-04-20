
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  console.log('Testing connection to:', supabaseUrl)
  const { data, error } = await supabase.from('todos').select('*').limit(1)
  
  if (error) {
    console.error('Connection error:', error.message)
    if (error.message.includes('relation "todos" does not exist')) {
      console.log('--- SUCCESS: Connected, but "todos" table does not exist yet. ---')
    }
  } else {
    console.log('Successfully connected! Data:', data)
  }
}

testConnection()
