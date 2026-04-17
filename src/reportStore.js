import { supabase } from './supabase'

function cloneData(data) {
  return JSON.parse(JSON.stringify(data))
}

export async function loadReportsFromCloud(storageKey) {
  const { data, error } = await supabase
    .from('daily_reports')
    .select('*')
    .eq('storage_key', storageKey)
    .order('report_date', { ascending: false })

  if (error) throw error

  return (data || []).map((item) => ({
    date: item.report_date,
    unitName: item.unit_name,
    manager: item.manager,
    rows: item.rows || {},
    result: item.result || {},
    totalScore: item.total_score || 0,
    conclusion: item.conclusion || '',
    issues: item.issues || [],
    savedAt: item.saved_at,
  }))
}

export async function getReportByDateFromCloud(storageKey, date) {
  const { data, error } = await supabase
    .from('daily_reports')
    .select('*')
    .eq('storage_key', storageKey)
    .eq('report_date', date)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    date: data.report_date,
    unitName: data.unit_name,
    manager: data.manager,
    rows: data.rows || {},
    result: data.result || {},
    totalScore: data.total_score || 0,
    conclusion: data.conclusion || '',
    issues: data.issues || [],
    savedAt: data.saved_at,
  }
}

export async function upsertReportToCloud(storageKey, payload) {
  const row = {
    storage_key: storageKey,
    report_date: payload.date,
    unit_name: payload.unitName,
    manager: payload.manager,
    rows: cloneData(payload.rows || {}),
    result: cloneData(payload.result || {}),
    total_score: Number(payload.totalScore || payload.result?.percent100 || 0),
    conclusion: payload.conclusion || payload.result?.conclusion || '',
    issues: cloneData(payload.issues || payload.result?.issues || []),
    saved_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('daily_reports')
    .upsert(row, { onConflict: 'storage_key,report_date' })

  if (error) throw error

  return loadReportsFromCloud(storageKey)
}