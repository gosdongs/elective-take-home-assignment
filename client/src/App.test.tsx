import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import type { WaitingListResponse } from "./api";

const initialWaitingList: WaitingListResponse = {
  capacity: 10,
  total_creators_waiting: 13,
  cohorts: [
    {
      id: "cohort_2",
      name: "Cohort 2",
      capacity: 10,
      created_at: "2026-05-25T00:00:00.000Z",
      creator_count: 3
    },
    {
      id: "cohort_1",
      name: "Cohort 1",
      capacity: 10,
      created_at: "2026-05-25T00:00:00.000Z",
      creator_count: 10
    }
  ]
};

const afterAddWaitingList: WaitingListResponse = {
  ...initialWaitingList,
  total_creators_waiting: 14,
  cohorts: [
    {
      ...initialWaitingList.cohorts[0],
      creator_count: 4
    },
    initialWaitingList.cohorts[1]
  ]
};

const afterTakeWaitingList: WaitingListResponse = {
  ...initialWaitingList,
  total_creators_waiting: 9,
  cohorts: [
    initialWaitingList.cohorts[0],
    {
      ...initialWaitingList.cohorts[1],
      creator_count: 6
    }
  ]
};

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(mockFetch));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("App", () => {
  it("renders the waiting list and cohort visualization", async () => {
    renderApp();

    expect(await screen.findByText("13 waiting")).toBeInTheDocument();
    expect(screen.getByText("Cohort 2")).toBeInTheDocument();
    expect(screen.getByText("10 / 10")).toBeInTheDocument();
    expect(screen.getByText("Next")).toBeInTheDocument();
  });

  it("submits a creator and updates the waiting count", async () => {
    const user = userEvent.setup();
    renderApp();

    await screen.findByText("13 waiting");

    await user.type(screen.getByLabelText("Name 1"), "Ada Lovelace");
    await user.type(screen.getByLabelText("Email 1"), "ada@example.com");
    await user.type(screen.getByLabelText("Phone 1"), "555-1234");
    await user.type(screen.getByLabelText("Course type 1"), "analytics");
    await user.click(screen.getByRole("button", { name: "Add Creators" }));

    expect(await screen.findByText("1 creator added.")).toBeInTheDocument();
    expect(screen.getByText("14 waiting")).toBeInTheDocument();
  });

  it("takes creators and shows recently removed rows", async () => {
    const user = userEvent.setup();
    renderApp();

    await screen.findByText("13 waiting");
    await user.click(screen.getByRole("button", { name: "Take Creators" }));

    expect(await screen.findByText("4 creators taken.")).toBeInTheDocument();
    expect(screen.getByText("9 waiting")).toBeInTheDocument();
    expect(screen.getByText("Removed Creator")).toBeInTheDocument();
  });
});

function renderApp() {
  return render(
    <MantineProvider>
      <App />
    </MantineProvider>
  );
}

function mockFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = String(input);
  const method = init?.method ?? "GET";

  if (url === "/api/waiting-list" && method === "GET") {
    return jsonResponse(initialWaitingList);
  }

  if (url === "/api/waiting-list/creators" && method === "POST") {
    return jsonResponse({
      added_creators: [
        {
          id: "creator_14",
          name: "Ada Lovelace",
          email_address: "ada@example.com",
          phone_number: "555-1234",
          course_type: "analytics",
          created_at: "2026-05-25T00:00:00.000Z"
        }
      ],
      waiting_list: afterAddWaitingList
    });
  }

  if (url === "/api/waiting-list/take" && method === "POST") {
    return jsonResponse({
      removed_count: 4,
      removed_creators: [
        {
          id: "creator_1",
          name: "Removed Creator",
          email_address: "removed@example.com",
          phone_number: "555-0000",
          course_type: "workshop",
          created_at: "2026-05-25T00:00:00.000Z",
          creator_cohort: {
            id: "creator_cohort_1",
            creator_id: "creator_1",
            cohort_id: "cohort_1",
            added_at: "2026-05-25T00:00:00.000Z",
            created_at: "2026-05-25T00:00:00.000Z",
            removed_at: "2026-05-25T00:00:00.000Z",
            removal_reason: "onboarded"
          }
        }
      ],
      waiting_list: afterTakeWaitingList
    });
  }

  return Promise.resolve(new Response(JSON.stringify({ message: "Not found" }), { status: 404 }));
}

function jsonResponse(body: unknown): Promise<Response> {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    })
  );
}
