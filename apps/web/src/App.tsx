import { useEffect, useState } from 'react';
import {
  AppShell,
  Container,
  Title,
  Text,
  Stack,
  Card,
  Badge,
  Group,
  Loader,
  Alert,
} from '@mantine/core';
import { IconAlertCircle, IconCircleCheck } from '@tabler/icons-react';
import type { HealthResponse } from '@giving-day/shared';

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const response = await fetch(`${apiUrl}/api/health`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        setHealth(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch health');
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Container h="100%" style={{ display: 'flex', alignItems: 'center' }}>
          <Title order={2}>Giving Day</Title>
        </Container>
      </AppShell.Header>

      <AppShell.Main>
        <Container size="sm" py="xl">
          <Stack gap="lg">
            <div>
              <Title order={1}>Welcome to Giving Day</Title>
              <Text c="dimmed" mt="xs">
                Volunteer management for monthly food-package distribution
              </Text>
            </div>

            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Title order={3} mb="md">
                System Status
              </Title>

              {loading && (
                <Group>
                  <Loader size="sm" />
                  <Text>Checking API health...</Text>
                </Group>
              )}

              {error && (
                <Alert
                  icon={<IconAlertCircle size={16} />}
                  title="Error"
                  color="red"
                >
                  {error}
                </Alert>
              )}

              {health && !error && (
                <Stack gap="md">
                  <Group>
                    <Text fw={500}>API Status:</Text>
                    <Badge
                      color={health.status === 'healthy' ? 'green' : 'red'}
                      leftSection={<IconCircleCheck size={12} />}
                    >
                      {health.status}
                    </Badge>
                  </Group>

                  <Group>
                    <Text fw={500}>Database:</Text>
                    <Badge
                      color={health.database.connected ? 'green' : 'red'}
                      variant="light"
                    >
                      {health.database.connected ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </Group>

                  <Text size="xs" c="dimmed">
                    Last checked: {new Date(health.timestamp).toLocaleString()}
                  </Text>
                </Stack>
              )}
            </Card>

            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Title order={4} mb="sm">
                About
              </Title>
              <Text size="sm">
                This app helps manage volunteers for monthly food-package
                distribution days. Admins can create distribution days,
                volunteers can confirm participation, and elders are matched to
                volunteers.
              </Text>
            </Card>
          </Stack>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
