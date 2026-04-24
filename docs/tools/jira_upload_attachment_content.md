# jira_upload_attachment_content

Upload in-memory content as a Jira issue attachment — no local file needed.

## Purpose

Use this tool when you have file content **already in memory** (AI-generated reports, CSV exports, JSON dumps, etc.) and want to attach it directly to a Jira issue **without saving to disk**.

For attaching an existing local file, use [`jira_add_attachment`](./jira_add_attachment.md) instead.

## Input Schema

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `issueKey` | `string` | ✅ | — | Jira issue key, e.g. `PROJ-123` |
| `filename` | `string` | ✅ | — | Filename with extension, e.g. `report.md`, `data.csv` |
| `content` | `string` | ✅ | — | File content as plain text (utf8) or base64-encoded string |
| `encoding` | `"utf8" \| "base64"` | ❌ | `"utf8"` | Content encoding |
| `mimeType` | `string` | ❌ | inferred | MIME type override, e.g. `text/markdown` |

### filename rules
- Must include a file extension (e.g. `.md`, `.csv`, `.json`)
- This becomes the displayed filename in Jira

### encoding
- **`utf8`** (default): `content` is a plain text string — most common case.
- **`base64`**: `content` is a base64-encoded string — use for binary data or when content comes from a base64 source.

### mimeType inference
If `mimeType` is omitted, it is inferred from the filename extension:

| Extension | Inferred MIME |
|-----------|--------------|
| `.md`, `.markdown` | `text/markdown` |
| `.txt`, `.log` | `text/plain` |
| `.csv` | `text/csv` |
| `.json` | `application/json` |
| `.xml` | `application/xml` |
| `.yaml`, `.yml` | `application/x-yaml` |
| `.html`, `.htm` | `text/html` |
| `.pdf` | `application/pdf` |
| `.png` | `image/png` |
| `.jpg`, `.jpeg` | `image/jpeg` |
| `.gif` | `image/gif` |
| `.svg` | `image/svg+xml` |
| `.zip` | `application/zip` |
| *(other)* | `application/octet-stream` |

## Output

On success, returns a Markdown table with upload results:

```
✅ **Attachment uploaded**

| File | Size | MIME | Attachment ID |
|---|---|---|---|
| report.md | 1.2 KB | text/markdown | 50123 |

**Issue:** https://jira.example.com/browse/PROJ-123
```

On failure, returns `isError: true` with a descriptive error message.

## Examples

### Upload a plain text report (utf8)

```json
{
  "issueKey": "PROJ-123",
  "filename": "bug-summary.md",
  "content": "# Bug Summary\n\n- Reproducible: Yes\n- Severity: High\n- Steps: ...",
  "encoding": "utf8"
}
```

### Upload a CSV export

```json
{
  "issueKey": "PROJ-456",
  "filename": "test-results.csv",
  "content": "Test,Status,Duration\nLogin flow,PASS,1.2s\nSearch,FAIL,0.8s",
  "encoding": "utf8"
}
```

### Upload base64-encoded content

```json
{
  "issueKey": "PROJ-789",
  "filename": "screenshot.png",
  "content": "iVBORw0KGgoAAAANSUhEUg...",
  "encoding": "base64",
  "mimeType": "image/png"
}
```

### Upload JSON with explicit MIME type

```json
{
  "issueKey": "PROJ-100",
  "filename": "api-response.json",
  "content": "{\"status\": \"error\", \"code\": 500}",
  "mimeType": "application/json"
}
```

## Error Cases

| Error | Cause |
|-------|-------|
| `Invalid input: issueKey must be a valid Jira key` | `issueKey` format is wrong |
| `Invalid input: filename must have a file extension` | `filename` has no `.ext` |
| `Invalid input: content is required` | Empty content string |
| `[SESSION_EXPIRED] ...` | Session cookie has expired — run `jira-auth-login` |
| `[JIRA_HTTP_ERROR] 404 ...` | Issue key does not exist |
