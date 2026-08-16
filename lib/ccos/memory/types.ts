export interface CognitiveMemoryEvent {
  id: string;
  type: string;
  entity: {
    type: string;
    id: string;
  };
  summary: string;
  sourceObservationIds: string[];
  brainVersion?: string;
  createdAt: string;
}
