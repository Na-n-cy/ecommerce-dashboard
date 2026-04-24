import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://orddxhxdsfkxgccnllvx.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yZGR4aHhkc2ZreGdjY25sbHZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MzA4NzksImV4cCI6MjA5MDUwNjg3OX0.IbMKIDluy2psRXI3acvdYzUb3JLhaPpXXZqFkNO1oAY'

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { error } = await supabase
    .from('search_events')
    .delete()
    .in('keyword', ['test keyword', 'test', 'serum'])
    .eq('shop_id', 'shop_001')

  if (error) {
    console.error('Error deleting:', error)
  } else {
    console.log('Deleted successfully.')
  }
}

run()
