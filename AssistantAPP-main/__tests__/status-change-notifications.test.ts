/**
 * @jest-environment jsdom
 */

// Mock the global Request constructor before any imports
global.Request = class MockRequest {
  constructor(public url: string, public init?: RequestInit) {}
  json() {
    return Promise.resolve(JSON.parse(this.init?.body as string || '{}'));
  }
} as any;

// Mock global fetch and Response
global.fetch = jest.fn();
global.Response = class MockResponse {
  constructor(public body?: any, public init?: ResponseInit) {}
  static json(data: any, init?: ResponseInit) {
    return {
      status: init?.status || 200,
      json: () => Promise.resolve(data),
      ok: (init?.status || 200) < 400
    };
  }
} as any;

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: any, init?: { status?: number }) => ({
      status: init?.status || 200,
      json: () => Promise.resolve(data),
      ok: (init?.status || 200) < 400
    })
  }
}));

describe('Status Change Notification System', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    // Reset console.log mock
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Status Change Notifications', () => {
    it('should generate proper notification content for status change', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const { mockStatusChangeNotification } = require('@/lib/notifications');
      
      const result = mockStatusChangeNotification({
        id: 'case_123',
        title: 'Work Visa Application',
        applicantName: 'John Smith',
        applicantEmail: 'john.smith@example.com',
        previousStatus: 'new',
        newStatus: 'in_review',
        changedBy: 'Admin User',
        changedAt: new Date('2024-01-15T10:30:00Z'),
        serviceType: {
          id: 'st_1',
          title: 'Work Visa',
          description: 'Employment-based visa applications'
        }
      });
      
      expect(result).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('STATUS CHANGE NOTIFICATION SENT')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Work Visa Application')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Previous Status: new')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('New Status: in_review')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Changed By: Admin User')
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle status changes without service type', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const { mockStatusChangeNotification } = require('@/lib/notifications');
      
      const result = mockStatusChangeNotification({
        id: 'case_124',
        title: 'General Consultation',
        applicantName: 'Jane Doe',
        applicantEmail: 'jane.doe@example.com',
        previousStatus: 'documents_pending',
        newStatus: 'approved',
        changedBy: 'System',
        changedAt: new Date('2024-01-15T14:30:00Z'),
        serviceType: null
      });
      
      expect(result).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Service Type: Not specified')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Previous Status: documents_pending')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('New Status: approved')
      );
      
      consoleSpy.mockRestore();
    });

    it('should send real notification when not in mock mode', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ sent: true })
      } as Response);

      const { sendStatusChangeNotification } = require('@/lib/notifications');
      
      const result = await sendStatusChangeNotification({
        id: 'case_123',
        title: 'Work Visa Application',
        applicantName: 'John Smith',
        applicantEmail: 'john.smith@example.com',
        previousStatus: 'new',
        newStatus: 'approved',
        changedBy: 'Admin User',
        changedAt: new Date('2024-01-15T10:30:00Z'),
        serviceType: {
          id: 'st_1',
          title: 'Work Visa',
          description: 'Employment-based visa applications'
        }
      });
      
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"action":"notify"')
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(callBody.to).toEqual(['admin@lvj.com']);
      expect(callBody.subject).toContain('Case Status Change: Work Visa Application → approved');
      expect(callBody.html).toContain('Previous Status:</strong> new');
      expect(callBody.html).toContain('New Status:</strong> approved');
    });
  });

  describe('Error Handling', () => {
    it('should handle notification API failures gracefully', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const { sendStatusChangeNotification } = require('@/lib/notifications');
      
      const result = await sendStatusChangeNotification({
        id: 'case_123',
        title: 'Work Visa Application',
        applicantName: 'John Smith',
        applicantEmail: 'john.smith@example.com',
        previousStatus: 'new',
        newStatus: 'approved',
        changedBy: 'Admin User',
        changedAt: new Date(),
        serviceType: null
      });
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to send status change notification:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle API endpoint failures when notification fails', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Service unavailable' })
      } as Response);

      const { sendStatusChangeNotification } = require('@/lib/notifications');
      
      const result = await sendStatusChangeNotification({
        id: 'case_123',
        title: 'Work Visa Application',
        applicantName: 'John Smith',
        applicantEmail: 'john.smith@example.com',
        previousStatus: 'new',
        newStatus: 'approved',
        changedBy: 'Admin User',
        changedAt: new Date(),
        serviceType: null
      });
      
      expect(result).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    it('should validate status change notification flow end-to-end', async () => {
      // Test the complete flow without Next.js dependencies
      const { mockStatusChangeNotification } = require('@/lib/notifications');
      
      // Mock console for audit logging
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const statusChangeData = {
        id: 'case_integration_test',
        title: 'Integration Test Case',
        applicantName: 'Test User',
        applicantEmail: 'test@example.com',
        previousStatus: 'new',
        newStatus: 'approved',
        changedBy: 'Integration Test',
        changedAt: new Date(),
        serviceType: {
          id: 'st_test',
          title: 'Test Service',
          description: 'Test service type for integration testing'
        }
      };

      const result = mockStatusChangeNotification(statusChangeData);
      
      expect(result).toBe(true);
      
      // Verify all required information is logged
      const logOutput = consoleSpy.mock.calls.map(call => call[0]).join(' ');
      expect(logOutput).toContain('Integration Test Case');
      expect(logOutput).toContain('Test User');
      expect(logOutput).toContain('test@example.com');
      expect(logOutput).toContain('Previous Status: new');
      expect(logOutput).toContain('New Status: approved');
      expect(logOutput).toContain('Changed By: Integration Test');
      expect(logOutput).toContain('Test Service');
      
      consoleSpy.mockRestore();
    });
  });
});