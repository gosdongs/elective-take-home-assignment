import {Badge, Box, Group, Text, Title} from "@mantine/core";
import {Users} from "lucide-react";

interface PageHeaderProps {
    totalWaiting: number;
}

export function PageHeader({totalWaiting}: PageHeaderProps) {
    return (
        <Group justify="space-between" align="flex-end" gap="md" className="page-header">
            <Box>
                <Title order={1}>Cohort Management</Title>
                <Text c="dimmed">Course creator onboarding queue</Text>
            </Box>
            <Badge size="xl" radius="sm" leftSection={<Users size={16}/>}>
                {totalWaiting} waiting
            </Badge>
        </Group>
    );
}
