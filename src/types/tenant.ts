export type OrganizationMemberRole = 'owner' | 'admin' | 'editor' | 'reviewer' | 'viewer';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  isActive: boolean;
}

export interface OrganizationMembership {
  organizationId: string;
  userId: string;
  role: OrganizationMemberRole;
  createdAt: string;
}

export interface OrganizationSubscription {
  organizationId: string;
  planName: string;
  operationLimit: number;
  operationsUsed: number;
  startsAt: string;
  expiresAt: string;
  status: 'trialing' | 'active' | 'expired' | 'suspended';
}
