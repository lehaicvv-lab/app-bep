import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://epyimmnnocvmfvlbmzzs.supabase.co'
const supabaseKey = 'sb_publishable_fJbBGMLCDZlnvAfVnnecsA_AwWcLCzi'

export const supabase = createClient(supabaseUrl, supabaseKey)