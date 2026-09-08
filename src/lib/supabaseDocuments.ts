import type { ReportDocument } from '../types/report';
import { getSupabaseClient } from './supabase';

export async function consumeOrganizationOperation(organizationId: string): Promise<void> {
  const { data, error } = await getSupabaseClient()
    .rpc('consume_operation', { target_organization_id: organizationId });
  if (error) throw error;
  if (data !== true) {
    throw new Error('This organization has reached its operation limit or its subscription is inactive.');
  }
}

interface DocumentRow {
  id: string;
  document_type: 'protocol' | 'report';
  status: ReportDocument['status'];
  system_name: string;
  document_number: string | null;
  payload: ReportDocument;
  created_at: string;
  updated_at: string;
}

function toReportDocument(row: DocumentRow): ReportDocument {
  return {
    ...row.payload,
    id: row.id,
    documentType: row.document_type,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function cloudGetAllDocuments(organizationId: string): Promise<ReportDocument[]> {
  const { data, error } = await getSupabaseClient()
    .from('documents')
    .select('id, document_type, status, system_name, document_number, payload, created_at, updated_at')
    .eq('organization_id', organizationId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data as DocumentRow[]).map(toReportDocument);
}

export async function cloudGetDocument(organizationId: string, id: string): Promise<ReportDocument | undefined> {
  const { data, error } = await getSupabaseClient()
    .from('documents')
    .select('id, document_type, status, system_name, document_number, payload, created_at, updated_at')
    .eq('organization_id', organizationId)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? toReportDocument(data as DocumentRow) : undefined;
}

export async function cloudSaveDocument(
  organizationId: string,
  userId: string,
  document: ReportDocument,
): Promise<void> {
  const { error } = await getSupabaseClient()
    .from('documents')
    .upsert({
      id: document.id,
      organization_id: organizationId,
      document_type: document.documentType,
      status: document.status,
      system_name: document.documentInfo.systemName,
      document_number: document.documentInfo.documentNumber || null,
      payload: document,
      created_by: userId,
      created_at: document.createdAt,
      updated_at: document.updatedAt,
    });
  if (error) throw error;
}

export async function cloudDeleteDocument(organizationId: string, id: string): Promise<void> {
  const { error } = await getSupabaseClient()
    .from('documents')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', id);
  if (error) throw error;
}
