export interface Check {
  tags: string[];
  id: string;
}

export interface CheckStatus {
  name: string;
  hasFailures: boolean;
  isDegraded: boolean;
  checkId: string;
}
