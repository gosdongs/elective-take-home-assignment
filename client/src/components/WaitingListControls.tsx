import type {FormEventHandler} from "react";
import {Button, Group, Loader, NumberInput, Paper, SimpleGrid, Stack, Text, Title} from "@mantine/core";
import {RotateCcw, Send} from "lucide-react";

interface WaitingListControlsProps {
    capacity: number | string;
    cohortCounts: number[];
    cohortTotal: number;
    isLoading: boolean;
    onCapacityChange: (value: number | string) => void;
    onCreateWaitingList: FormEventHandler<HTMLFormElement>;
    onTakeCountChange: (value: number | string) => void;
    onTakeCreators: FormEventHandler<HTMLFormElement>;
    takeCount: number | string;
}

export function WaitingListControls({
    capacity,
    cohortCounts,
    cohortTotal,
    isLoading,
    onCapacityChange,
    onCreateWaitingList,
    onTakeCountChange,
    onTakeCreators,
    takeCount
}: WaitingListControlsProps) {
    return (
        <SimpleGrid cols={{base: 1, md: 3}} spacing="lg">
            <Paper className="control-panel" withBorder radius="sm" p="md">
                <form onSubmit={onCreateWaitingList}>
                    <Stack gap="md">
                        <Group justify="space-between">
                            <Title order={2}>Waiting List</Title>
                            {isLoading ? <Loader size="sm"/> : null}
                        </Group>
                        <NumberInput
                            label="Capacity"
                            min={1}
                            allowDecimal={false}
                            value={capacity}
                            onChange={onCapacityChange}
                        />
                        <Button type="submit" leftSection={<RotateCcw size={16}/>} variant="light">
                            Reset List
                        </Button>
                    </Stack>
                </form>
            </Paper>

            <Paper className="control-panel" withBorder radius="sm" p="md">
                <form onSubmit={onTakeCreators}>
                    <Stack gap="md">
                        <Title order={2}>Onboard</Title>
                        <NumberInput
                            label="Take count"
                            min={0}
                            allowDecimal={false}
                            value={takeCount}
                            onChange={onTakeCountChange}
                        />
                        <Button type="submit" leftSection={<Send size={16}/>}>
                            Take Creators
                        </Button>
                    </Stack>
                </form>
            </Paper>

            <Paper className="metric-panel" withBorder radius="sm" p="md">
                <Stack gap="sm">
                    <Text size="sm" c="dimmed">
                        Current cohorts
                    </Text>
                    <Title order={2}>{cohortTotal}</Title>
                    <Text size="sm" c="dimmed">
                        Counts [{cohortCounts.join(", ") || "empty"}]
                    </Text>
                </Stack>
            </Paper>
        </SimpleGrid>
    );
}
