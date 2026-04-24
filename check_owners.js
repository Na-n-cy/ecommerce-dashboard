import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://orddxhxdsfkxgccnllvx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yZGR4aHhkc2ZreGdjY25sbHZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MzA4NzksImV4cCI6MjA5MDUwNjg3OX0.IbMKIDluy2psRXI3acvdYzUb3JLhaPpXXZqFkNO1oAY'
)

async function checkOwners() {
  const { data, error } = await supabase.from('owners').select('*')
  if (error) console.error(error)
  else console.log(JSON.stringify(data, null, 2))
}

checkOwners()
