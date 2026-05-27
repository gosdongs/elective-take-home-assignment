import {ActionIcon, Badge, Box, Group, Paper, Stack, Text, Title, Tooltip} from "@mantine/core";
import {Trash2} from "lucide-react";
import type {CohortSummary, Creator} from "../api";

interface CohortsPanelProps {
    capacity: number;
    cohorts: CohortSummary[];
    isLoading: boolean;
    onRemoveCreator: (creator: Creator, cohortName: string) => void;
}

export function CohortsPanel({capacity, cohorts, isLoading, onRemoveCreator}: CohortsPanelProps) {
    return (
        <Paper className="cohort-panel" withBorder radius="sm" p="md">
            <Stack gap="md">
                <Group justify="space-between">
                    <Title order={2}>Cohorts</Title>
                    <Badge variant="light" color="gray" radius="sm">
                        Capacity {capacity}
                    </Badge>
                </Group>
                {cohorts.length > 0 ? (
                    <div className="cohort-strip" aria-label="Cohorts ordered newest to oldest">
                        {cohorts.map((cohort, index) => {
                            const isOldest = index === cohorts.length - 1;
                            return (
                                <div className={`cohort-tile${isOldest ? " cohort-tile--oldest" : ""}`}
                                     key={cohort.id}>
                                    <Group justify="space-between" align="center" wrap="nowrap">
                                        <Text fw={700}>{cohort.name}</Text>
                                    </Group>
                                    <Text className="cohort-count">{cohort.creator_count}</Text>
                                    <Text size="sm" c="dimmed">
                                        {cohort.creator_count} / {cohort.capacity}
                                    </Text>
                                    {cohort.creators.length > 0 ? (
                                        <Stack gap={6} className="cohort-creators">
                                            {cohort.creators.map((creator) => (
                                                <Box className="cohort-creator" key={creator.id}>
                                                    <Box className="cohort-creator-details">
                                                        <Text size="sm" fw={700} truncate="end">
                                                            {creator.name}
                                                        </Text>
                                                        <Text size="xs" c="dimmed" truncate="end">
                                                            {creator.course_type}
                                                        </Text>
                                                        <Text size="xs" c="dimmed" truncate="end">
                                                            {creator.email_address}
                                                        </Text>
                                                        <Text size="xs" c="dimmed" truncate="end">
                                                            {creator.phone_number}
                                                        </Text>
                                                    </Box>
                                                    <Tooltip label={`Remove ${creator.name}`}>
                                                        <ActionIcon
                                                            aria-label={`Remove ${creator.name}`}
                                                            variant="subtle"
                                                            color="red"
                                                            size="sm"
                                                            disabled={isLoading}
                                                            onClick={() => onRemoveCreator(creator, cohort.name)}
                                                        >
                                                            <Trash2 size={15}/>
                                                        </ActionIcon>
                                                    </Tooltip>
                                                </Box>
                                            ))}
                                        </Stack>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <Box className="empty-state">No creators waiting</Box>
                )}
            </Stack>
        </Paper>
    );
}
