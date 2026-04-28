export interface Candidate {
  id: string;
  name: string;
  description?: string;
  emoji: string;
}

export interface Election {
  id: string;
  title: string;
  description?: string;
  candidates: Candidate[];
  isOpen: boolean;
  createdAt: string;
  closedAt?: string;
}
