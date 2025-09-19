import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock Next.js modules
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, options) => ({
      json: () => Promise.resolve(data),
      ok: !options?.status || options.status < 400,
      status: options?.status || 200
    }))
  }
}));

jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn()
}));

jest.mock('@/lib/auth', () => ({
  getAuthOptions: jest.fn()
}));

jest.mock('@/lib/db', () => ({
  getPrisma: jest.fn()
}));

describe('Service Types API', () => {
  beforeEach(() => {
    // Reset environment variables
    process.env.SKIP_DB = '1';
    jest.clearAllMocks();
  });

  describe('GET /api/service-types', () => {
    it('should return mock service types when SKIP_DB is enabled', async () => {
      const { GET } = await import('@/app/api/service-types/route');
      const request = new Request('http://localhost:3000/api/service-types');
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(data.serviceTypes).toBeDefined();
      expect(Array.isArray(data.serviceTypes)).toBe(true);
      expect(data.serviceTypes.length).toBeGreaterThan(0);
      expect(data.serviceTypes[0]).toHaveProperty('id');
      expect(data.serviceTypes[0]).toHaveProperty('title');
      expect(data.serviceTypes[0]).toHaveProperty('description');
    });
  });

  describe('POST /api/service-types', () => {
    it('should return 403 for non-admin users', async () => {
      const { getServerSession } = await import('next-auth/next');
      (getServerSession as jest.MockedFunction<typeof getServerSession>).mockResolvedValue({
        user: { id: 'user1', role: 'STAFF' }
      });

      const { POST } = await import('@/app/api/service-types/route');
      const request = new Request('http://localhost:3000/api/service-types', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test Service', description: 'Test Description' })
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(403);
    });

    it('should create service type for LVJ_ADMIN', async () => {
      const { getServerSession } = await import('next-auth/next');
      (getServerSession as jest.MockedFunction<typeof getServerSession>).mockResolvedValue({
        user: { id: 'admin1', role: 'LVJ_ADMIN' }
      });

      const { POST } = await import('@/app/api/service-types/route');
      const request = new Request('http://localhost:3000/api/service-types', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test Service', description: 'Test Description' })
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(201);
      expect(data.serviceType).toBeDefined();
      expect(data.serviceType.title).toBe('Test Service');
      expect(data.serviceType.description).toBe('Test Description');
    });

    it('should return 400 if title is missing', async () => {
      const { getServerSession } = await import('next-auth/next');
      (getServerSession as jest.MockedFunction<typeof getServerSession>).mockResolvedValue({
        user: { id: 'admin1', role: 'LVJ_ADMIN' }
      });

      const { POST } = await import('@/app/api/service-types/route');
      const request = new Request('http://localhost:3000/api/service-types', {
        method: 'POST',
        body: JSON.stringify({ description: 'Test Description' })
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(400);
    });
  });
});

describe('Case Creation with Service Types', () => {
  beforeEach(() => {
    process.env.SKIP_DB = '1';
    jest.clearAllMocks();
  });

  it('should create case with service type and send notification', async () => {
    const { getServerSession } = await import('next-auth/next');
    (getServerSession as jest.MockedFunction<typeof getServerSession>).mockResolvedValue({
      user: { id: 'staff1', role: 'STAFF' }
    });

    // Mock console.log to capture notification
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const { POST } = await import('@/app/api/cases/route');
    const request = new Request('http://localhost:3000/api/cases', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Test Case',
        applicantName: 'John Doe',
        applicantEmail: 'john@example.com',
        serviceTypeId: 'st_1'
      })
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(201);
    expect(data.case).toBeDefined();
    expect(data.case.serviceTypeId).toBe('st_1');
    
    // Check that notification was sent
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('MOCK NOTIFICATION SENT')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Service Type: Work Visa')
    );

    consoleSpy.mockRestore();
  });

  it('should create case without service type', async () => {
    const { getServerSession } = await import('next-auth/next');
    (getServerSession as jest.MockedFunction<typeof getServerSession>).mockResolvedValue({
      user: { id: 'staff1', role: 'STAFF' }
    });

    const { POST } = await import('@/app/api/cases/route');
    const request = new Request('http://localhost:3000/api/cases', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Test Case',
        applicantName: 'Jane Doe',
        applicantEmail: 'jane@example.com'
      })
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(201);
    expect(data.case).toBeDefined();
    expect(data.case.serviceTypeId).toBe(null);
  });
});

describe('Notification System', () => {
  it('should generate proper notification content with service type', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    const { mockIntakeNotification } = require('@/lib/notifications');
    
    const result = mockIntakeNotification({
      id: 'case_123',
      title: 'Work Visa Application',
      applicantName: 'John Smith',
      applicantEmail: 'john.smith@example.com',
      serviceType: {
        id: 'st_1',
        title: 'Work Visa',
        description: 'Employment-based visa applications'
      }
    });
    
    expect(result).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Work Visa Application')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('John Smith')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Service Type: Work Visa')
    );
    
    consoleSpy.mockRestore();
  });

  it('should handle cases without service type', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    const { mockIntakeNotification } = require('@/lib/notifications');
    
    const result = mockIntakeNotification({
      id: 'case_124',
      title: 'General Consultation',
      applicantName: 'Jane Doe',
      applicantEmail: 'jane.doe@example.com'
    });
    
    expect(result).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Service Type: Not specified')
    );
    
    consoleSpy.mockRestore();
  });
});