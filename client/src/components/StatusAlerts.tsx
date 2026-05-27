import {Alert} from "@mantine/core";

interface StatusAlertsProps {
    error: string | null;
    message: string | null;
}

export function StatusAlerts({error, message}: StatusAlertsProps) {
    return (
        <>
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
        </>
    );
}
