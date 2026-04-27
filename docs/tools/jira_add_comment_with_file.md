# jira_add_comment_with_file

Upload a file as a Jira issue attachment and post a comment that references it — in a single tool call.

## Purpose

Jira Server 8 does not support attaching files directly to comments via REST API. This tool works around that limitation by:

1. **Uploading the file** to the issue's attachment list.
2. **Posting a comment** whose body automatically includes a Jira Wiki Markup reference to the uploaded file.

In Jira Wiki Markup:
- `[^filename.md]` → clickable download link (for non-image files)
- `!filename.png!` → image displayed inline in the comment (for PNG/JPG/GIF/SVG)

## Input Schema

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `issueKey` | `string` | ✅ | — | Jira issue key, e.g. `PROJ-123` |
| `body` | `string` | ✅ | — | Comment body (Markdown by default) |
| `bodyFormat` | `"markdown" \| "plain"` | ❌ | `"markdown"` | How to interpret `body` |
| `filename` | `string` | ✅ | — | Attachment filename with extension, e.g. `report.md` |
| `fileContent` | `string` | ✅ | — | File content as plain text (utf8) or base64-encoded string |
| `fileEncoding` | `"utf8" \| "base64"` | ❌ | `"utf8"` | Encoding of `fileContent` |
| `mimeType` | `string` | ❌ | inferred | MIME type override, e.g. `text/markdown` |
| `attachmentPlacement` | `"append" \| "inline"` | ❌ | `"append"` | Where to place the `[^filename]` reference |

### bodyFormat

- **`markdown`** (default): converts Markdown to Jira Wiki Markup before posting.
- **`plain`**: body is sent as-is (use when writing raw Jira Wiki Markup).

### attachmentPlacement

Controls where the attachment reference is injected into the comment body:

| Value | Behaviour |
|-------|-----------|
| `"append"` (default) | A `📎 **Attachment:** [^filename]` line is added at the bottom of the comment. |
| `"inline"` | The literal placeholder `{{ATTACHMENT}}` anywhere in the body is replaced with `[^filename]`. Useful for embedding the reference mid-sentence. If the placeholder is missing, falls back to `"append"`. |

### fileEncoding & mimeType

Same rules as [`jira_upload_attachment_content`](./jira_upload_attachment_content.md):
- **`utf8`** (default): `fileContent` is a plain text string.
- **`base64`**: `fileContent` is a base64-encoded string — use for binary data.
- If `mimeType` is omitted it is inferred from the filename extension (`.md` → `text/markdown`, `.png` → `image/png`, etc.).

## Output

On success:

```
✅ **Comment with attachment posted**

| Field           | Value |
|-----------------|-------|
| **Issue**       | [PROJ-123](https://jira.example.com/browse/PROJ-123) |
| **Comment ID**  | 90001 |
| **File**        | report.md |
| **Attachment ID** | 80001 |
| **Comment URL** | https://jira.example.com/... |
```

On failure, returns `isError: true`. If the upload succeeded but comment posting failed, the error message includes the attachment ID so the file can be located.

## Examples

### Append a Markdown report with file reference at the bottom (default)

```json
{
  "issueKey": "PROJ-123",
  "body": "# Analysis\n\nSee the attached file for full details.",
  "filename": "analysis.md",
  "fileContent": "# Full Analysis\n\n..."
}
```

The posted comment will contain (converted to Wiki Markup):
```
h1. Analysis

See the attached file for full details.

📎 *Attachment:* [^analysis.md]
```

### Embed the reference inline using `{{ATTACHMENT}}` placeholder

```json
{
  "issueKey": "PROJ-456",
  "body": "Download the export here: {{ATTACHMENT}}\n\nPlease review before the sprint ends.",
  "bodyFormat": "plain",
  "filename": "sprint-export.csv",
  "fileContent": "Story,Points,Status\nPROJ-100,3,Done",
  "attachmentPlacement": "inline"
}
```

The `{{ATTACHMENT}}` placeholder is replaced with `[^sprint-export.csv]`:
```
Download the export here: [^sprint-export.csv]

Please review before the sprint ends.
```

### Attach and embed a screenshot inline

```json
{
  "issueKey": "PROJ-789",
  "body": "Reproduced the bug — see screenshot below:\n\n{{ATTACHMENT}}",
  "bodyFormat": "plain",
  "filename": "bug-screenshot.png",
  "fileContent": "iVBORw0KGgoAAAANSUhEUg...",
  "fileEncoding": "base64",
  "mimeType": "image/png",
  "attachmentPlacement": "inline"
}
```

Images use `!filename!` syntax and are rendered inline in Jira:
```
Reproduced the bug — see screenshot below:

!bug-screenshot.png!
```

## Error Cases

| Error | Cause |
|-------|-------|
| `Invalid input: issueKey must be a valid Jira key` | `issueKey` format is wrong |
| `Invalid input: filename must have a file extension` | `filename` has no `.ext` |
| `Invalid input: body is required` | Empty body string |
| `[SESSION_EXPIRED] ...` | Session cookie has expired — run `jira-auth-login` |
| `[JIRA_HTTP_ERROR] 404 ...` | Issue key does not exist |
| `⚠️ Attachment uploaded (ID: ...) but comment posting failed: ...` | Upload succeeded but comment POST failed — file is already attached to the issue |

## Related Tools

| Tool | When to use |
|------|-------------|
| [`jira_upload_attachment_content`](./jira_upload_attachment_content.md) | Upload only — no comment |
| [`jira_add_attachment`](./jira_add_attachment.md) | Upload a local workspace file — no comment |
| [`jira_add_comment`](./jira_add_comment.md) | Post a comment — no file |
| [`jira_get_comments`](./jira_get_comments.md) | View comments after posting |
