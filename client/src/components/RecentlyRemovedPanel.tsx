import {Box, Divider, Paper, Stack, Table, Title} from "@mantine/core";
import type {RemovedCreator} from "../api";

interface RecentlyRemovedPanelProps {
    recentlyRemoved: RemovedCreator[];
}

export function RecentlyRemovedPanel({recentlyRemoved}: RecentlyRemovedPanelProps) {
    return (
        <Paper className="control-panel" withBorder radius="sm" p="md">
            <Stack gap="md">
                <Title order={2}>Recently Removed</Title>
                <Divider/>
                {recentlyRemoved.length > 0 ? (
                    <Table striped highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Name</Table.Th>
                                <Table.Th>Email</Table.Th>
                                <Table.Th>Reason</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {recentlyRemoved.map((creator) => (
                                <Table.Tr key={creator.creator_cohort.id}>
                                    <Table.Td>{creator.name}</Table.Td>
                                    <Table.Td>{creator.email_address}</Table.Td>
                                    <Table.Td>{creator.creator_cohort.removal_reason}</Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                ) : (
                    <Box className="empty-state">No recent removals</Box>
                )}
            </Stack>
        </Paper>
    );
}
