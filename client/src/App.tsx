import {FormEvent, useEffect, useMemo, useState} from "react";
import {Box, Container, Stack} from "@mantine/core";
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
import {AddCreatorsPanel} from "./components/AddCreatorsPanel";
import {CohortsPanel} from "./components/CohortsPanel";
import {PageHeader} from "./components/PageHeader";
import {RecentlyRemovedPanel} from "./components/RecentlyRemovedPanel";
import {RemoveCreatorModal, type CreatorRemovalTarget} from "./components/RemoveCreatorModal";
import {StatusAlerts} from "./components/StatusAlerts";
import {WaitingListControls} from "./components/WaitingListControls";

type CreatorFormRow = CreatorInput;

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
            <RemoveCreatorModal
                isLoading={isLoading}
                onClose={closeRemoveCreatorDialog}
                onReasonChange={(reason) => {
                    setCreatorRemovalReason(reason);
                    setCreatorRemovalReasonError(null);
                }}
                onSubmit={handleRemoveCreator}
                reason={creatorRemovalReason}
                reasonError={creatorRemovalReasonError}
                target={creatorRemovalTarget}
            />

            <Container size="xl" py="xl">
                <Stack gap="lg">
                    <PageHeader totalWaiting={totalWaiting}/>
                    <StatusAlerts error={error} message={message}/>
                    <WaitingListControls
                        capacity={capacity}
                        cohortCounts={cohortCounts}
                        cohortTotal={cohorts.length}
                        isLoading={isLoading}
                        onCapacityChange={setCapacity}
                        onCreateWaitingList={handleCreateWaitingList}
                        onTakeCountChange={setTakeCount}
                        onTakeCreators={handleTakeCreators}
                        takeCount={takeCount}
                    />
                    <CohortsPanel
                        capacity={waitingList?.capacity ?? 10}
                        cohorts={cohorts}
                        isLoading={isLoading}
                        onRemoveCreator={openRemoveCreatorDialog}
                    />
                    <AddCreatorsPanel
                        creatorRows={creatorRows}
                        onAddRow={addCreatorRow}
                        onRemoveRow={removeCreatorRow}
                        onSubmit={handleAddCreators}
                        onUpdateRow={updateCreatorRow}
                    />
                    <RecentlyRemovedPanel recentlyRemoved={recentlyRemoved}/>
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
