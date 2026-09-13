import type { SensorData } from './analysis';
import { getSupabaseClient } from './supabase';

interface SensorFileRow {
  id: string;
  payload: SensorData;
}

export async function cloudGetAllSensorFiles(
  organizationId: string,
  documentId: string,
): Promise<SensorData[]> {
  const { data, error } = await getSupabaseClient()
    .from('sensor_files')
    .select('id, payload')
    .eq('organization_id', organizationId)
    .eq('document_id', documentId);
  if (error) throw error;
  return (data as SensorFileRow[]).map((row) => row.payload);
}

export async function cloudSaveSensorFile(
  organizationId: string,
  documentId: string,
  sensor: SensorData,
): Promise<void> {
  const { error } = await getSupabaseClient()
    .from('sensor_files')
    .upsert({
      id: sensor.id,
      document_id: documentId,
      organization_id: organizationId,
      payload: sensor,
      updated_at: new Date().toISOString(),
    });
  if (error) throw error;
}

export async function cloudDeleteSensorFile(
  organizationId: string,
  documentId: string,
  id: string,
): Promise<void> {
  const { error } = await getSupabaseClient()
    .from('sensor_files')
    .delete()
    .eq('organization_id', organizationId)
    .eq('document_id', documentId)
    .eq('id', id);
  if (error) throw error;
}

export async function cloudClearSensorFiles(
  organizationId: string,
  documentId: string,
): Promise<void> {
  const { error } = await getSupabaseClient()
    .from('sensor_files')
    .delete()
    .eq('organization_id', organizationId)
    .eq('document_id', documentId);
  if (error) throw error;
}
