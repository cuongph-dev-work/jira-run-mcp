import { describe, it, expect } from "vitest";
import { mapIssue, mapIssueSummary } from "../jira/mappers.js";

const BASE_URL = "https://jira.example.com";

const rawFullIssue = {
  key: "PROJ-42",
  fields: {
    summary: "Fix login bug",
    description: "Users cannot log in after session expires.",
    status: { name: "In Progress" },
    assignee: { displayName: "Alice Smith" },
    reporter: { displayName: "Bob Jones" },
    priority: { name: "High" },
    issuetype: { name: "Bug" },
    created: "2024-01-15T10:00:00.000Z",
    updated: "2024-01-20T15:30:00.000Z",
  },
};

const rawAdfIssue = {
  key: "PROJ-99",
  fields: {
    summary: "ADF description test",
    description: {
      version: 1,
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "First paragraph." }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Second paragraph." }],
        },
      ],
    },
    status: { name: "Open" },
    assignee: null,
    reporter: null,
    priority: null,
    issuetype: { name: "Task" },
    created: "2024-02-01T08:00:00.000Z",
    updated: "2024-02-02T09:00:00.000Z",
  },
};

describe("mapIssue", () => {
  it("maps a full issue with all fields", () => {
    const result = mapIssue(rawFullIssue, BASE_URL);

    expect(result.key).toBe("PROJ-42");
    expect(result.summary).toBe("Fix login bug");
    expect(result.description).toBe("Users cannot log in after session expires.");
    expect(result.status).toBe("In Progress");
    expect(result.assignee).toBe("Alice Smith");
    expect(result.reporter).toBe("Bob Jones");
    expect(result.priority).toBe("High");
    expect(result.issueType).toBe("Bug");
    expect(result.url).toBe(`${BASE_URL}/browse/PROJ-42`);
  });

  it("maps null assignee and reporter to null", () => {
    const raw = { ...rawFullIssue, fields: { ...rawFullIssue.fields, assignee: null, reporter: null } };
    const result = mapIssue(raw, BASE_URL);
    expect(result.assignee).toBeNull();
    expect(result.reporter).toBeNull();
  });

  it("maps null description to null", () => {
    const raw = { ...rawFullIssue, fields: { ...rawFullIssue.fields, description: null } };
    const result = mapIssue(raw, BASE_URL);
    expect(result.description).toBeNull();
  });

  it("extracts plain text from ADF description", () => {
    const result = mapIssue(rawAdfIssue, BASE_URL);
    expect(result.description).toContain("First paragraph.");
    expect(result.description).toContain("Second paragraph.");
  });
});

describe("mapIssueSummary", () => {
  it("returns only compact fields", () => {
    const result = mapIssueSummary(rawFullIssue, BASE_URL);

    expect(result.key).toBe("PROJ-42");
    expect(result.summary).toBe("Fix login bug");
    expect(result.status).toBe("In Progress");
    expect(result.assignee).toBe("Alice Smith");
    expect(result.priority).toBe("High");
    expect(result.url).toBe(`${BASE_URL}/browse/PROJ-42`);
    // Full-issue-only fields should not exist
    expect((result as unknown as Record<string, unknown>)["description"]).toBeUndefined();
    expect((result as unknown as Record<string, unknown>)["reporter"]).toBeUndefined();
    // issueType IS included in summary
    expect(result.issueType).toBe("Bug");
  });
});
