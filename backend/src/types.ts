export interface User {
  id: string;
  email: string;
  passwordHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Workflow {
  id: string;
  userId: string;
  name: string;
  steps: any[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Integration {
  id: string;
  userId: string;
  provider: 'gmail' | 'drive' | 'github';
  accessToken: string;
  refreshToken?: string;
  connectedAt: Date;
}
