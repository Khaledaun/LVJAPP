interface ServiceType {
  id: string;
  title: string;
  description: string | null;
}

interface CaseData {
  id: string;
  title: string;
  applicantName: string;
  applicantEmail: string;
  serviceType?: ServiceType | null;
}

interface StatusChangeData {
  id: string;
  title: string;
  applicantName: string;
  applicantEmail: string;
  previousStatus: string;
  newStatus: string;
  changedBy?: string;
  changedAt: Date;
  serviceType?: ServiceType | null;
}

/**
 * Send notification to legal team about new case intake
 */
export async function sendIntakeNotification(caseData: CaseData): Promise<boolean> {
  try {
    const serviceTypeInfo = caseData.serviceType 
      ? `<strong>Service Type:</strong> ${caseData.serviceType.title}<br>
         ${caseData.serviceType.description ? `<em>${caseData.serviceType.description}</em><br>` : ''}`
      : '<strong>Service Type:</strong> Not specified<br>';

    const html = `
      <h2>New Case Intake Notification</h2>
      <p>A new case has been created and requires attention from the legal team.</p>
      
      <h3>Case Details:</h3>
      <p>
        <strong>Case Title:</strong> ${caseData.title}<br>
        <strong>Applicant Name:</strong> ${caseData.applicantName}<br>
        <strong>Applicant Email:</strong> ${caseData.applicantEmail}<br>
        ${serviceTypeInfo}
      </p>
      
      <p>
        <strong>Case ID:</strong> ${caseData.id}<br>
        <strong>Created:</strong> ${new Date().toLocaleString()}
      </p>
      
      <p>Please review this case and assign appropriate legal resources as needed.</p>
      
      <p>
        <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/cases/${caseData.id}" 
           style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
          View Case
        </a>
      </p>
    `;

    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'notify',
        to: ['legal@lvj.com', 'admin@lvj.com'], // Configure these emails in production
        subject: `New Case Intake: ${caseData.title}`,
        html
      })
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to send intake notification:', error);
    return false;
  }
}

/**
 * Mock notification for development when SKIP_DB=1
 */
export function mockIntakeNotification(caseData: CaseData): boolean {
  const serviceTypeInfo = caseData.serviceType 
    ? `Service Type: ${caseData.serviceType.title}${caseData.serviceType.description ? ` (${caseData.serviceType.description})` : ''}`
    : 'Service Type: Not specified';

  console.log(`
📧 MOCK NOTIFICATION SENT
=========================
To: legal@lvj.com, admin@lvj.com
Subject: New Case Intake: ${caseData.title}

Case Details:
- Case Title: ${caseData.title}
- Applicant: ${caseData.applicantName} (${caseData.applicantEmail})
- ${serviceTypeInfo}
- Case ID: ${caseData.id}
- Created: ${new Date().toLocaleString()}

Please review this case and assign appropriate legal resources as needed.
  `);
  
  return true;
}

/**
 * Send notification to LVJ Admin about case status changes
 */
export async function sendStatusChangeNotification(statusData: StatusChangeData): Promise<boolean> {
  try {
    const serviceTypeInfo = statusData.serviceType 
      ? `<strong>Service Type:</strong> ${statusData.serviceType.title}<br>
         ${statusData.serviceType.description ? `<em>${statusData.serviceType.description}</em><br>` : ''}`
      : '<strong>Service Type:</strong> Not specified<br>';

    const html = `
      <h2>Case Status Change Notification</h2>
      <p>A case status has been updated and requires your attention.</p>
      
      <h3>Case Details:</h3>
      <p>
        <strong>Case Title:</strong> ${statusData.title}<br>
        <strong>Applicant Name:</strong> ${statusData.applicantName}<br>
        <strong>Applicant Email:</strong> ${statusData.applicantEmail}<br>
        ${serviceTypeInfo}
      </p>
      
      <h3>Status Change Details:</h3>
      <p>
        <strong>Previous Status:</strong> ${statusData.previousStatus}<br>
        <strong>New Status:</strong> ${statusData.newStatus}<br>
        <strong>Changed By:</strong> ${statusData.changedBy || 'System'}<br>
        <strong>Changed At:</strong> ${statusData.changedAt.toLocaleString()}
      </p>
      
      <p>
        <strong>Case ID:</strong> ${statusData.id}
      </p>
      
      <p>Please review this status change and take any necessary actions.</p>
      
      <p>
        <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/cases/${statusData.id}" 
           style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
          View Case
        </a>
      </p>
    `;

    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'notify',
        to: ['admin@lvj.com'], // Configure admin emails in production
        subject: `Case Status Change: ${statusData.title} → ${statusData.newStatus}`,
        html
      })
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to send status change notification:', error);
    return false;
  }
}

/**
 * Mock status change notification for development when SKIP_DB=1
 */
export function mockStatusChangeNotification(statusData: StatusChangeData): boolean {
  const serviceTypeInfo = statusData.serviceType 
    ? `Service Type: ${statusData.serviceType.title}${statusData.serviceType.description ? ` (${statusData.serviceType.description})` : ''}`
    : 'Service Type: Not specified';

  console.log(`
📧 MOCK STATUS CHANGE NOTIFICATION SENT
=======================================
To: admin@lvj.com
Subject: Case Status Change: ${statusData.title} → ${statusData.newStatus}

Case Details:
- Case Title: ${statusData.title}
- Applicant: ${statusData.applicantName} (${statusData.applicantEmail})
- ${serviceTypeInfo}
- Case ID: ${statusData.id}

Status Change:
- Previous Status: ${statusData.previousStatus}
- New Status: ${statusData.newStatus}
- Changed By: ${statusData.changedBy || 'System'}
- Changed At: ${statusData.changedAt.toLocaleString()}

Please review this status change and take any necessary actions.
  `);
  
  return true;
}