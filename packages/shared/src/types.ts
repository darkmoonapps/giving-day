export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  database: {
    connected: boolean;
  };
}
