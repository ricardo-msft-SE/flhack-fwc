export type RequestStatus = "queued" | "running" | "completed" | "incomplete" | "error";

export interface SoftwareRequestInput {
  softwareName: string;
  softwareVersion: string;
  vendorName: string;
  businessJustification: string;
  licenseCount: number;
  requesterName: string;
  requesterDepartment: string;
  requesterEmail?: string;
}

export interface SoftwareRequestRecord {
  requestId: string;
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  status: RequestStatus;
  foundryRunId?: string;
  errorMessage?: string;
  input: SoftwareRequestInput;
  recommendation: "Approve" | "Conditional Approve" | "Reject" | "Pending";
  riskSummary: {
    compliance: "Low" | "Medium" | "High";
    security: "Low" | "Medium" | "High";
    vendor: "Low" | "Medium" | "High";
  };
  evidenceUrls: string[];
  decision?: {
    source: "teams-card" | "left-rail";
    value: "Approve" | "Conditional Approve" | "Reject";
    comment?: string;
    actor?: string;
    decidedAt: string;
  };
}

export interface SubmitRequestResponse {
  requestId: string;
  sessionId: string;
  status: RequestStatus;
}
