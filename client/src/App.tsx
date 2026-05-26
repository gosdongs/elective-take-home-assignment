import {FormEvent, useEffect, useMemo, useState} from "react";
import {
    ActionIcon,
    Alert,
    Badge,
    Box,
    Button,
    Container,
    Divider,
    Group,
    Loader,
    Modal,
    NumberInput,
    Paper,
    SimpleGrid,
    Stack,
    Table,
    Text,
    Textarea,
    TextInput,
    Title,
    Tooltip
} from "@mantine/core";
import {Plus, RotateCcw, Send, Trash2, UserPlus, Users} from "lucide-react";
import {
    addCreators,
    createWaitingList,
    getWaitingList,
    removeCreator,
    takeCreators,
    type Creator,
    type CreatorInput,
    type RemovedCreator,
    type WaitingListResponse
} from "./api";

type CreatorFormRow = CreatorInput;
type CreatorRemovalTarget = {
    creator: Creator;
    cohortName: string;
};

const emptyCreatorRow: CreatorFormRow = {
    name: "",
    email_address: "",
    phone_number: "",
    course_type: ""
};

function App() {
    const [waitingList, setWaitingList] = useState<WaitingListResponse | null>(null);
    const [creatorRows, setCreatorRows] = useState<CreatorFormRow[]>([{...emptyCreatorRow}]);
    const [capacity, setCapacity] = useState<number | string>(10);
    const [takeCount, setTakeCount] = useState<number | string>(1);
    const [recentlyRemoved, setRecentlyRemoved] = useState<RemovedCreator[]>([]);
    const [creatorRemovalTarget, setCreatorRemovalTarget] = useState<CreatorRemovalTarget | null>(null);
    const [creatorRemovalReason, setCreatorRemovalReason] = useState("");
    const [creatorRemovalReasonError, setCreatorRemovalReasonError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const totalWaiting = waitingList?.total_creators_waiting ?? 0;
    const cohorts = waitingList?.cohorts ?? [];

    const cohortCounts = useMemo(() => cohorts.map((cohort) => cohort.creator_count), [cohorts]);

    useEffect(() => {
        void refreshWaitingList();
    }, []);

    async function refreshWaitingList() {
        setIsLoading(true);
        setError(null);

        try {
            setWaitingList(await getWaitingList());
        } catch (currentError) {
            setError(currentError instanceof Error ? currentError.message : "Unable to load waiting list.");
        } finally {
            setIsLoading(false);
        }
    }

    async function handleCreateWaitingList(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        await runAction(async () => {
            const nextCapacity = Number(capacity);
            const nextWaitingList = await createWaitingList(nextCapacity);
            setWaitingList(nextWaitingList);
            setRecentlyRemoved([]);
            setMessage(`Waiting list reset with capacity ${nextWaitingList.capacity}.`);
        });
    }

    async function handleAddCreators(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const completedRows = creatorRows.filter(isCompleteCreatorRow).map(trimCreatorRow);
        const hasPartialRow = creatorRows.some((row) => !isBlankCreatorRow(row) && !isCompleteCreatorRow(row));

        if (hasPartialRow || completedRows.length === 0) {
            setError("Complete at least one creator row before adding.");
            setMessage(null);
            return;
        }

        await runAction(async () => {
            const response = await addCreators(completedRows);
            setWaitingList(response.waiting_list);
            setCreatorRows([{...emptyCreatorRow}]);
            setMessage(`${response.added_creators.length} creator${response.added_creators.length === 1 ? "" : "s"} added.`);
        });
    }

    async function handleTakeCreators(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        await runAction(async () => {
            const response = await takeCreators(Number(takeCount));
            setWaitingList(response.waiting_list);
            setRecentlyRemoved((current) => [...response.removed_creators, ...current].slice(0, 8));
            setMessage(`${response.removed_count} creator${response.removed_count === 1 ? "" : "s"} taken.`);
        });
    }

    async function handleRemoveCreator(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!creatorRemovalTarget) {
            return;
        }

        const removalReason = creatorRemovalReason.trim();
        if (removalReason.length === 0) {
            setCreatorRemovalReasonError("Enter a removal reason.");
            return;
        }

        await runAction(async () => {
            const response = await removeCreator(creatorRemovalTarget.creator.id, removalReason);
            setWaitingList(response.waiting_list);
            setRecentlyRemoved((current) => [response.removed_creator, ...current].slice(0, 8));
            setMessage(`${response.removed_creator.name} removed.`);
            closeRemoveCreatorDialog();
        });
    }

    async function runAction(action: () => Promise<void>) {
        setIsLoading(true);
        setError(null);
        setMessage(null);

        try {
            await action();
        } catch (currentError) {
            setError(currentError instanceof Error ? currentError.message : "Something went wrong.");
        } finally {
            setIsLoading(false);
        }
    }

    function updateCreatorRow(index: number, field: keyof CreatorFormRow, value: string) {
        setCreatorRows((currentRows) =>
            currentRows.map((row, currentIndex) => (currentIndex === index ? {...row, [field]: value} : row))
        );
    }

    function addCreatorRow() {
        setCreatorRows((currentRows) => [...currentRows, {...emptyCreatorRow}]);
    }

    function removeCreatorRow(index: number) {
        setCreatorRows((currentRows) => currentRows.filter((_row, currentIndex) => currentIndex !== index));
    }

    function openRemoveCreatorDialog(creator: Creator, cohortName: string) {
        setCreatorRemovalTarget({creator, cohortName});
        setCreatorRemovalReason("");
        setCreatorRemovalReasonError(null);
    }

    function closeRemoveCreatorDialog() {
        setCreatorRemovalTarget(null);
        setCreatorRemovalReason("");
        setCreatorRemovalReasonError(null);
    }

    return (
        <Box className="app-shell">
            <Modal
                opened={creatorRemovalTarget !== null}
                onClose={closeRemoveCreatorDialog}
                title="Remove Creator"
                centered
                radius="sm"
            >
                <form onSubmit={handleRemoveCreator}>
                    <Stack gap="md">
                        <Box>
                            <Text fw={700}>{creatorRemovalTarget?.creator.name}</Text>
                            <Text size="sm" c="dimmed">
                                {creatorRemovalTarget?.cohortName}
                            </Text>
                        </Box>
                        <Textarea
                            label="Removal reason"
                            aria-label="Removal reason"
                            value={creatorRemovalReason}
                            error={creatorRemovalReasonError}
                            minRows={3}
                            required
                            onChange={(event) => {
                                setCreatorRemovalReason(event.currentTarget.value);
                                setCreatorRemovalReasonError(null);
                            }}
                        />
                        <Group justify="flex-end">
                            <Button type="button" variant="default" onClick={closeRemoveCreatorDialog}
                                    disabled={isLoading}>
                                Cancel
                            </Button>
                            <Button type="submit" color="red" leftSection={<Trash2 size={16}/>} loading={isLoading}>
                                Remove Creator
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>

            <Container size="xl" py="xl">
                <Stack gap="lg">
                    <Group justify="space-between" align="flex-end" gap="md" className="page-header">
                        <Box>
                            <Title order={1}>Cohort Management</Title>
                            <Text c="dimmed">Course creator onboarding queue</Text>
                        </Box>
                        <Badge size="xl" radius="sm" leftSection={<Users size={16}/>}>
                            {totalWaiting} waiting
                        </Badge>
                    </Group>

                    {error ? (
                        <Alert color="red" title="Action needed" radius="sm">
                            {error}
                        </Alert>
                    ) : null}

                    {message ? (
                        <Alert color="teal" title="Updated" radius="sm">
                            {message}
                        </Alert>
                    ) : null}

                    <SimpleGrid cols={{base: 1, md: 3}} spacing="lg">
                        <Paper className="control-panel" withBorder radius="sm" p="md">
                            <form onSubmit={handleCreateWaitingList}>
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
                                        onChange={setCapacity}
                                    />
                                    <Button type="submit" leftSection={<RotateCcw size={16}/>} variant="light">
                                        Reset List
                                    </Button>
                                </Stack>
                            </form>
                        </Paper>

                        <Paper className="control-panel" withBorder radius="sm" p="md">
                            <form onSubmit={handleTakeCreators}>
                                <Stack gap="md">
                                    <Title order={2}>Onboard</Title>
                                    <NumberInput
                                        label="Take count"
                                        min={0}
                                        allowDecimal={false}
                                        value={takeCount}
                                        onChange={setTakeCount}
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
                                <Title order={2}>{cohorts.length}</Title>
                                <Text size="sm" c="dimmed">
                                    Counts [{cohortCounts.join(", ") || "empty"}]
                                </Text>
                            </Stack>
                        </Paper>
                    </SimpleGrid>

                    <Paper className="cohort-panel" withBorder radius="sm" p="md">
                        <Stack gap="md">
                            <Group justify="space-between">
                                <Title order={2}>Cohorts</Title>
                                <Badge variant="light" color="gray" radius="sm">
                                    Capacity {waitingList?.capacity ?? 10}
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
                                                    {isOldest ? (
                                                        <Badge color="orange" radius="sm">
                                                            Next
                                                        </Badge>
                                                    ) : null}
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
                                                                        onClick={() => openRemoveCreatorDialog(creator, cohort.name)}
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

                    <Paper className="control-panel" withBorder radius="sm" p="md">
                        <form onSubmit={handleAddCreators}>
                            <Stack gap="md">
                                <Group justify="space-between">
                                    <Title order={2}>Add Creators</Title>
                                    <Button type="button" variant="light" leftSection={<Plus size={16}/>}
                                            onClick={addCreatorRow}>
                                        Add Row
                                    </Button>
                                </Group>

                                <Stack gap="sm">
                                    {creatorRows.map((row, index) => (
                                        <SimpleGrid className="creator-row" cols={{base: 1, md: 5}} spacing="sm"
                                                    key={index}>
                                            <TextInput
                                                label={`Name ${index + 1}`}
                                                value={row.name}
                                                onChange={(event) => updateCreatorRow(index, "name", event.currentTarget.value)}
                                            />
                                            <TextInput
                                                label={`Email ${index + 1}`}
                                                value={row.email_address}
                                                onChange={(event) => updateCreatorRow(index, "email_address", event.currentTarget.value)}
                                            />
                                            <TextInput
                                                label={`Phone ${index + 1}`}
                                                value={row.phone_number}
                                                onChange={(event) => updateCreatorRow(index, "phone_number", event.currentTarget.value)}
                                            />
                                            <TextInput
                                                label={`Course type ${index + 1}`}
                                                value={row.course_type}
                                                onChange={(event) => updateCreatorRow(index, "course_type", event.currentTarget.value)}
                                            />
                                            <Group align="flex-end">
                                                <Tooltip label="Remove row">
                                                    <ActionIcon
                                                        aria-label={`Remove creator row ${index + 1}`}
                                                        variant="subtle"
                                                        color="red"
                                                        size="lg"
                                                        disabled={creatorRows.length === 1}
                                                        onClick={() => removeCreatorRow(index)}
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
                </Stack>
            </Container>
        </Box>
    );
}

function isBlankCreatorRow(row: CreatorFormRow): boolean {
    return Object.values(row).every((value) => value.trim().length === 0);
}

function isCompleteCreatorRow(row: CreatorFormRow): boolean {
    return Object.values(row).every((value) => value.trim().length > 0);
}

function trimCreatorRow(row: CreatorFormRow): CreatorFormRow {
    return {
        name: row.name.trim(),
        email_address: row.email_address.trim(),
        phone_number: row.phone_number.trim(),
        course_type: row.course_type.trim()
    };
}

export default App;
