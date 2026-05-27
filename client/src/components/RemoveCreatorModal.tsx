import type {FormEventHandler} from "react";
import {Box, Button, Group, Modal, Stack, Text, Textarea} from "@mantine/core";
import {Trash2} from "lucide-react";
import type {Creator} from "../api";

export interface CreatorRemovalTarget {
    creator: Creator;
    cohortName: string;
}

interface RemoveCreatorModalProps {
    isLoading: boolean;
    onClose: () => void;
    onReasonChange: (reason: string) => void;
    onSubmit: FormEventHandler<HTMLFormElement>;
    reason: string;
    reasonError: string | null;
    target: CreatorRemovalTarget | null;
}

export function RemoveCreatorModal({
    isLoading,
    onClose,
    onReasonChange,
    onSubmit,
    reason,
    reasonError,
    target
}: RemoveCreatorModalProps) {
    return (
        <Modal opened={target !== null} onClose={onClose} title="Remove Creator" centered radius="sm">
            <form onSubmit={onSubmit}>
                <Stack gap="md">
                    <Box>
                        <Text fw={700}>{target?.creator.name}</Text>
                        <Text size="sm" c="dimmed">
                            {target?.cohortName}
                        </Text>
                    </Box>
                    <Textarea
                        label="Removal reason"
                        aria-label="Removal reason"
                        value={reason}
                        error={reasonError}
                        minRows={3}
                        required
                        onChange={(event) => onReasonChange(event.currentTarget.value)}
                    />
                    <Group justify="flex-end">
                        <Button type="button" variant="default" onClick={onClose} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button type="submit" color="red" leftSection={<Trash2 size={16}/>} loading={isLoading}>
                            Remove Creator
                        </Button>
                    </Group>
                </Stack>
            </form>
        </Modal>
    );
}
