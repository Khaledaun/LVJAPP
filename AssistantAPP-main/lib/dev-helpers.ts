// Development helpers for dual-mode operation
export const isDevelopmentMode = process.env.NODE_ENV === 'development';
export const skipAuth = process.env.SKIP_AUTH === '1' || process.env.SKIP_AUTH === 'true';
export const skipDB = process.env.SKIP_DB === '1' || process.env.SKIP_DB === 'true';

export const mockCases = [
  {
    id: 'case-001',
    caseNumber: 'LVJ-2024-001',
    clientId: 'client-001', 
    visaType: 'H1B',
    overallStatus: 'IN_PROGRESS',
    destinationCountry: 'United States',
    urgencyLevel: 'STANDARD',
    completionPercentage: 65,
    client: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
    caseManager: { firstName: 'Sarah', lastName: 'Johnson', email: 'sarah@lvj.com' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const mockUser = {
  id: 'user-demo',
  email: 'demo@lvj.com',
  role: 'LVJ_ADMIN',
  firstName: 'Demo',
  lastName: 'User'
};

export function useMockData() {
  return isDevelopmentMode && (skipDB || skipAuth);
}
