import type {FormEventHandler} from "react";
import {ActionIcon, Button, Group, Paper, SimpleGrid, Stack, TextInput, Title, Tooltip} from "@mantine/core";
import {Plus, Trash2, UserPlus} from "lucide-react";
import type {CreatorInput} from "../api";

interface AddCreatorsPanelProps {
    creatorRows: CreatorInput[];
    onAddRow: () => void;
    onRemoveRow: (index: number) => void;
    onSubmit: FormEventHandler<HTMLFormElement>;
    onUpdateRow: (index: number, field: keyof CreatorInput, value: string) => void;
}

export function AddCreatorsPanel({
    creatorRows,
    onAddRow,
    onRemoveRow,
    onSubmit,
    onUpdateRow
}: AddCreatorsPanelProps) {
    return (
        <Paper className="control-panel" withBorder radius="sm" p="md">
            <form onSubmit={onSubmit}>
                <Stack gap="md">
                    <Group justify="space-between">
                        <Title order={2}>Add Creators</Title>
                        <Button type="button" variant="light" leftSection={<Plus size={16}/>} onClick={onAddRow}>
                            Add Row
                        </Button>
                    </Group>

                    <Stack gap="sm">
                        {creatorRows.map((row, index) => (
                            <SimpleGrid className="creator-row" cols={{base: 1, md: 5}} spacing="sm" key={index}>
                                <TextInput
                                    label={`Name ${index + 1}`}
                                    value={row.name}
                                    onChange={(event) => onUpdateRow(index, "name", event.currentTarget.value)}
                                />
                                <TextInput
                                    label={`Email ${index + 1}`}
                                    value={row.email_address}
                                    onChange={(event) => onUpdateRow(index, "email_address", event.currentTarget.value)}
                                />
                                <TextInput
                                    label={`Phone ${index + 1}`}
                                    value={row.phone_number}
                                    onChange={(event) => onUpdateRow(index, "phone_number", event.currentTarget.value)}
                                />
                                <TextInput
                                    label={`Course type ${index + 1}`}
                                    value={row.course_type}
                                    onChange={(event) => onUpdateRow(index, "course_type", event.currentTarget.value)}
                                />
                                <Group align="flex-end">
                                    <Tooltip label="Remove row">
                                        <ActionIcon
                                            aria-label={`Remove creator row ${index + 1}`}
                                            variant="subtle"
                                            color="red"
                                            size="lg"
                                            disabled={creatorRows.length === 1}
                                            onClick={() => onRemoveRow(index)}
                                        >
                                            <Trash2 size={18}/>
                                        </ActionIcon>
                                    </Tooltip>
                                </Group>
                            </SimpleGrid>
                        ))}
                    </Stack>

                    <Button type="submit" leftSection={<UserPlus size={16}/>} className="submit-button">
                        Add Creators
                    </Button>
                </Stack>
            </form>
        </Paper>
    );
}
