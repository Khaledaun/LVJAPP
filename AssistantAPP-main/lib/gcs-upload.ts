// Google Cloud Storage upload workflow
interface UploadUrlRequest {
  filename: string;
  contentType: string;
  caseId: string;
}

interface SignedUrlResponse {
  url: string;
  objectName: string;
  bucket: string;
}

export async function generateSignedUploadUrl(request: UploadUrlRequest): Promise<SignedUrlResponse> {
  const timestamp = Date.now();
  const objectName = `cases/${request.caseId}/documents/${timestamp}-${request.filename}`;
  const bucket = process.env.GCS_BUCKET || 'lvj-case-uploads-dev';
  
  return {
    url: `https://storage.googleapis.com/${bucket}/${objectName}?uploadId=mock-${timestamp}`,
    objectName,
    bucket
  };
}

export async function finalizeDocumentUpload(request: any) {
  return {
    documentId: `doc-${Date.now()}`,
    status: 'UPLOADED',
    url: `https://storage.googleapis.com/${process.env.GCS_BUCKET || 'lvj-case-uploads-dev'}/${request.objectName}`,
    ...request
  };
}
