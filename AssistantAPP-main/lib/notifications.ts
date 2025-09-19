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