# ScriptRunner JQL Functions Reference

> **Source**: https://docs.adaptavist.com/sr4js/latest/features/jql-functions  
> **Requires**: ScriptRunner for Jira Data Center plugin installed on the Jira instance.  
> **Note**: These functions **extend** standard Jira JQL. They require the `issueFunction` field (or a specific Jira field) with `in` / `not in` operators.

---

## Syntax

```
issueFunction in <functionName>(<args>)
issueFunction not in <functionName>(<args>)
```

Most ScriptRunner functions use `issueFunction` as the field. Some use a standard Jira field (e.g. `assignee in inactiveUsers()`).

---

## 1. Issue Links

### `hasLinks()`
Find issues that have any link, or a specific link type/count.

```jql
-- All issues with any link
issueFunction in hasLinks()

-- Issues with "blocks" links
issueFunction in hasLinks("blocks")

-- Issues with more than 2 "blocks" links
issueFunction in hasLinks("blocks", "+2")
```

### `hasLinkType()`
Find issues with a specific named link type (direction-agnostic — matches both inward and outward).

```jql
-- All unresolved issues of type "Blocks"
issueFunction in hasLinkType("Blocks") and resolution is empty
```

> **Equivalent**: `hasLinkType("Blocks")` = `hasLinks("blocks") OR hasLinks("is blocked by")`

### `linkedIssuesOf()`
Return issues that are linked to issues matching a subquery.

```jql
-- Unresolved issues blocked by Open issues
issueFunction in linkedIssuesOf("status = Open", "blocks") and resolution is empty

-- Issues linked to any unresolved issue
issueFunction in linkedIssuesOf("resolution = unresolved")

-- Multiple link types at once
issueFunction in linkedIssuesOf("", "is blocked by", "is cloned by")
```

### `linkedIssuesOfRecursive()`
Return ALL recursively linked issues (follows chains of links).

```jql
-- All issues directly and indirectly linked to SSP-1
issueFunction in linkedIssuesOfRecursive("issue = SSP-1")

-- Restricted to "blocks" link type
issueFunction in linkedIssuesOfRecursive("issue = SSP-1", "blocks")

-- Follow multiple link types
issueFunction in linkedIssuesOfRecursive("issue = SSP-1", "blocks", "clones")
```

### `linkedIssuesOfRecursiveLimited()`
Same as recursive, but with a **max traversal depth**.

```jql
-- Max 2 links deep from all issues in SSP project
issueFunction in linkedIssuesOfRecursiveLimited("project = SSP", 2)

-- Max 3 deep, "is blocked by" only
issueFunction in linkedIssuesOfRecursiveLimited("issue = SSP-2", 3, "is blocked by")
```

### `epicsOf()`
Find epics that **contain** issues matching a subquery.

```jql
-- Epics that have unresolved stories
issueFunction in epicsOf("resolution = unresolved")
```

> Only epics with at least one issue are returned. Empty epics are excluded.

### `issuesInEpics()`
Find issues **belonging to** epics matching a subquery.

```jql
-- Issues in a project whose epic is "To Do"
issueFunction in issuesInEpics("project = SSP and status = 'To Do'")

-- Unresolved issues in resolved epics
issueFunction in issuesInEpics("resolution is not empty") and resolution is empty
```

### `issuePickerField()`
Find issues based on the issues selected in a specified Issue Picker custom field.

```jql
-- Issues that have bugs linked via Issue Picker
issueFunction in issuePickerField("Issue Picker", "issuetype = Bug")
```

### `hasRemoteLinks()`
Find issues with any remote link (Confluence, web pages, etc.).

```jql
issueFunction in hasRemoteLinks()
```

### `linkedIssuesOfRemote()`
Find issues linked to remote content, with wildcard support (`*`, `?`).

```jql
-- Linked to Confluence application
issueFunction in linkedIssuesOfRemote("application name", "Confluence")

-- Linked to any Atlassian app
issueFunction in linkedIssuesOfRemote("application type", "com.atlassian.*")

-- Find issues by specific page ID query param
issueFunction in linkedIssuesOfRemote("query", "pageId=11469162")

-- Linked to a specific web host
issueFunction in linkedIssuesOfRemote("host", "www.stackoverflow.com")
```

**Supported remote link properties**: `title`, `url`, `application name`, `application type`, `relationship`, `host`, `path`, `query`

### Legacy Functions

- `linkedIssuesOfAll()` — like `linkedIssuesOf` but also includes subtask and epic links
- `linkedIssuesOfAllRecursive()` — like `linkedIssuesOfRecursive` + subtask/epic links
- `linkedIssuesOfAllRecursiveLimited()` — like `linkedIssuesOfRecursiveLimited` + subtask/epic links

---

## 2. Sub-tasks

### `hasSubtasks()`
Find parent issues that have at least one subtask.

```jql
issueFunction in hasSubtasks()
```

### `subtasksOf()`
Find subtasks of parent issues matching a subquery.

```jql
issueFunction in subtasksOf("project = MYPROJ and status = 'In Progress'")

-- Subtasks of issues in a saved filter
issueFunction in subtasksOf("filter = 'Issues in Epic'")
```

### `parentsOf()`
Find parents of subtasks matching a subquery.

```jql
issueFunction in parentsOf("issuetype = Sub-task and status = Open")
```

---

## 3. Date Functions

### `dateCompare()`
Compare two date fields on the same issue.

```jql
issueFunction in dateCompare("<subquery>", "<date comparison expression>")
```

**Supported date fields**: `created`, `dueDate`, `resolutionDate`, `firstCommented`, `lastCommented`, custom date/datetime picker fields.

**Operators**: `<`, `>`, `<=`, `>=`, `=`

```jql
-- Issues resolved AFTER their due date
issueFunction in dateCompare("", "resolutionDate > dueDate")

-- Issues resolved within 2 weeks of creation
issueFunction in dateCompare("", "created +2w > resolutionDate")

-- Issues not commented within 1 week of creation
issueFunction in dateCompare("", "created +1w < firstCommented")

-- Issues resolved after a custom "Delivery Date" field
issueFunction in dateCompare("", "resolutionDate > Delivery Date")

-- With a project filter for performance
issueFunction in dateCompare("project in myProjects()", "resolutionDate > dueDate")
```

> **Time windows**: append `+Nd`, `+Nw`, `+Nm` to any date field in the expression.  
> **Custom fields**: Multi-word names don't need quotes inside the expression.

### `lastUpdated()`
Find issues by the user who last made an update (edits, state changes, links, comments).

```jql
-- Last updated by a specific user
issueFunction in lastUpdated("by cuongph")

-- Last updated by current user
issueFunction in lastUpdated("by currentUser()")

-- Last updated by role
issueFunction in lastUpdated("inRole Administrators")

-- Last updated by group
issueFunction in lastUpdated("inGroup jira-developers")
```

---

## 4. Calculations

### `expression()`
Compare and calculate using system/custom numeric, date, and duration fields.

```jql
issueFunction in expression("<subquery>", "<expression>")
```

**Supported fields**: `timeSpent`, `originalEstimate`, `remainingEstimate`, `created`, `due`, `lastViewed`, `resolved`, `updated`, `votes`, `workRatio`, `creator`, `reporter`, `assignee`, and any numeric/date/datetime custom fields.

```jql
-- Time spent exceeds original estimate
issueFunction in expression("", "timespent > originalestimate")

-- On track to exceed estimate (unresolved issues)
issueFunction in expression("resolution = empty", "timespent + remainingestimate > originalestimate")

-- Time spent exceeded estimate by 5+ working days
issueFunction in expression("", "timespent > originalestimate + 5*wd")

-- Issues going to miss due date based on remaining estimate
issueFunction in expression("resolution is empty", "now() + fromTimeTracking(remainingestimate) > duedate")

-- Creator is different from reporter
issueFunction in expression("", "creator != reporter")

-- Issues due on same day as created
issueFunction in expression("", "created.clearTime() == dueDate")

-- Story points / business value ratio
issueFunction in expression("", "StoryPoints / BusinessValue > 50")
```

> **Time units**: use `5*d` (5 calendar days) or `5*wd` (5 working days), **NOT** `5d`.  
> **fromTimeTracking()**: converts time-tracking internal units to real duration for date comparison.  
> **Custom field names**: remove spaces (e.g., `StoryPoints` for "Story Points"). Use `customfield_12345` if punctuation exists.

### `aggregateExpression()`
Perform aggregate calculations across matched issues and display summary.

```jql
issueFunction in aggregateExpression("<label>", "<expression>")
```

```jql
-- Total estimate for all issues
project = SSP and issueFunction in aggregateExpression("Total Estimate", "originalEstimate.sum()")

-- Total story points
project = SSP and issueFunction in aggregateExpression("Total SP", "storypoints.sum()")

-- Multiple aggregates at once
project = SSP and issueFunction in aggregateExpression(
  "Total Estimate", "originalEstimate.sum()",
  "Remaining work", "remainingEstimate.sum()"
)
```

**Available aggregate expressions**:

| Expression | Description |
|---|---|
| `timespent.sum()` | Total time spent |
| `originalestimate.average()` | Average original estimate |
| `workratio.average()` | Average work ratio (decimal) |
| `remainingEstimate.sum()` | Total remaining work |
| `(originalEstimate.sum() - timeSpent.sum()) / remainingEstimate.sum()` | Tracking error |
| `reporter.count('username')` | Issues created by a user |
| `reporter.countBy{it}` | Breakdown by reporter |

---

## 5. Comments

### `hasComments()`
Find issues with comments, optionally by count.

```jql
-- Any issues with comments
issueFunction in hasComments()

-- Exactly 3 comments
issueFunction in hasComments(3)

-- More than 5 comments
issueFunction in hasComments('+5')

-- Less than 3 comments
issueFunction in hasComments('-3')
```

### `commented()`
Find issues by attributes of their comments.

```jql
issueFunction in commented("<comment query>")
```

**Supported arguments**: `on`, `after`, `before` (dates), `by` (username/function), `inRole`, `inGroup`, `roleLevel`, `groupLevel`, `visibility` (internal/external).

```jql
-- Commented recently
issueFunction in commented("after -7d")

-- Commented by admin within last 4 weeks
issueFunction in commented("after -4w by admin")

-- Comments visible only to Developers role
issueFunction in commented("roleLevel Developers")

-- Internal comments (Jira Service Management)
issueFunction in commented("visibility internal")

-- Commented this month by current user
issueFunction in commented("after startOfMonth() by currentUser()")

-- Commented last calendar month by current user
issueFunction in commented("after startOfMonth(-1) before endOfMonth(-1) by currentUser()")
```

### `lastComment()`
Like `commented()` but restricted to **only the last comment** on each issue.

```jql
-- Issues where last comment was NOT by a Developer
project = FOO and issueFunction not in lastComment("inRole Developers")

-- Last comment by Users role, more than 4 hours ago, not by Developer
issueFunction in lastComment("inRole Users before -4h") && issueFunction not in lastComment("inRole Developers")
```

---

## 6. Attachments

### `hasAttachments()`
Find issues with attachments, optionally filtered by extension and count.

```jql
-- Any attachments
issueFunction in hasAttachments()

-- PDF attachments
issueFunction in hasAttachments("pdf")

-- Exactly 7 PDF attachments
issueFunction in hasAttachments("pdf", "7")

-- More than 3 PDFs
issueFunction in hasAttachments("pdf", "+3")

-- More than 5 attachments of any type
issueFunction in hasAttachments("", "+5")
```

### `fileAttached()`
Find issues by attributes of their attachments (date, user).

```jql
-- Attachments added by current user in the past week
issueFunction in fileAttached("after -1w by currentUser()")
```

---

## 7. Worklog Functions

### `workLogged()`
Find issues with work logged by a user, role, group, or within a date range.

```jql
issueFunction in workLogged("<worklog query>")
```

**Supported arguments**:

| Argument | Example |
|---|---|
| `on date` | `on 2025/03/28` |
| `after date` | `after 2025/03/25` |
| `before date` | `before 2025/04/01` |
| `by username` | `by cuongph` or `by currentUser()` |
| `inRole role` | `inRole Developers` |
| `inGroup group` | `inGroup jira-developers` |

**Date formats**: `yyyy/MM/dd`, `yyyy-MM-dd`, period (`-5d`), date function (`startOfMonth()`, `endOfMonth()`, etc.)

```jql
-- Work logged by "admin" on a specific date
issueFunction in workLogged("on 2025/03/28 by admin")

-- Work logged by Developers role last calendar month
issueFunction in workLogged("after startOfMonth(-1) before endOfMonth(-1) inRole Developers")

-- Work logged by currentUser this month
issueFunction in workLogged("after startOfMonth() by currentUser()")
```

---

## 8. User Functions

### `inactiveUsers()`
Find issues assigned to (or reported by, etc.) inactive users.

```jql
-- Assigned to inactive users
assignee in inactiveUsers()

-- Assigned to ACTIVE users only (inverted)
assignee not in inactiveUsers()
```

### `memberOfRole()`
Find issues where a user field value belongs to a specific role.

```jql
-- Reporter is in Administrators role
issueFunction in memberOfRole("Reporter", "Administrators")

-- Reporter is in any of multiple roles
issueFunction in memberOfRole("Reporter", "Administrators", "Developers")

-- Best practice: always add a project filter
project = SUP and issueFunction in memberOfRole("Approvers", "Service Desk Team")
```

### `jiraUserPropertyEquals()`
Find issues where a user field matches a user property value.

```jql
-- Assignee in the AMER region
assignee in jiraUserPropertyEquals("region", "AMER")

-- Active users only in EMEA
reporter in jiraUserPropertyEquals("region", "EMEA") and reporter not in inactiveUsers()
```

---

## 9. Sprint Functions

### `addedAfterSprintStart()`
Issues added to a sprint after it started.

```jql
issueFunction in addedAfterSprintStart("project = MYPROJ", "sprint name")
```

### `completeInSprint()`
Issues completed during a sprint.

```jql
issueFunction in completeInSprint("project = MYPROJ", "sprint name")
```

### `incompleteInSprint()`
Issues not completed during a sprint.

```jql
issueFunction in incompleteInSprint("project = MYPROJ", "sprint name")
```

### `removedAfterSprintStart()`
Issues removed from a sprint after it started.

```jql
issueFunction in removedAfterSprintStart("project = MYPROJ", "sprint name")
```

### `nextSprint()`
Find issues in the next sprint.

```jql
issueFunction in nextSprint()
```

### `previousSprint()`
Find issues from the previous sprint.

```jql
issueFunction in previousSprint()
```

---

## 10. Match Functions (Regex)

### `issueFieldMatch()`
Find issues where a field matches a **regex** pattern.

```jql
-- Description contains "ABC" followed by 4 digits
issueFunction in issueFieldMatch("project = JRA", "description", "ABC\\d{4}")

-- Case-insensitive match
issueFunction in issueFieldMatch("project = JRA", "description", "(?i)ABC\\d{4}")
```

> **Performance**: ~20,000 issues/sec. Use a specific subquery for best results.  
> **Full match**: use `^` and `$` boundary matchers (e.g. `^ABC\\d{4}$`).

### `issueFieldExactMatch()`
Find issues where a field **exactly equals** a value.

```jql
issueFunction in issueFieldExactMatch("project = JRA", "Error Code", "ERR-404")
```

### `projectMatch()`
Find issues in projects matching a regex.

```jql
-- Projects starting with "Test"
project in projectMatch("^Test.*")
```

### `componentMatch()`
Find issues with components matching a regex.

```jql
-- Components starting with "Web"
component in componentMatch("^Web.*")
```

### `versionMatch()`
Find issues with versions matching a regex.

```jql
-- Fix versions starting with "RC"
project = JRA and fixVersion in versionMatch("^RC.*")
```

---

## 11. Versions

### `releaseDate()`
Find issues by the release date of associated versions.

```jql
-- Fix version releasing in next 10 days
fixVersion in releaseDate("after now() before 10d")

-- Fix version released on a specific date
fixVersion in releaseDate("on 2025/09/07")
```

### `startDate()`
Find issues by the start date of associated versions.

```jql
-- Fix version not starting until 2 weeks from now
fixVersion in startDate("after 14d")
```

### `overdue()`
Find issues with overdue versions (unreleased + release date in the past).

```jql
-- All issues in overdue versions
fixVersion in overdue()

-- Fix version at least 2 weeks overdue
fixVersion in overdue("before -14d")
```

### `earliestUnreleasedVersionByReleaseDate()`
Find the earliest unreleased version sorted by release date.

```jql
fixVersion in earliestUnreleasedVersionByReleaseDate("JRA")

-- Include archived versions
fixVersion in earliestUnreleasedVersionByReleaseDate("JRA", "true")
```

### `archivedVersions()`
Find issues with archived versions.

```jql
-- Issues with archived fix versions
fixVersion in archivedVersions()

-- Issues without archived fix versions
fixVersion not in archivedVersions()
```

---

## 12. Projects

### `myProjects()`
Issues from projects where the current user is a member.

```jql
project in myProjects() and status = Open
```

### `recentProjects()`
Issues from recently viewed projects.

```jql
project in recentProjects()
```

### `projectsOfType()`
Issues from projects of a specific type.

```jql
project in projectsOfType("service_desk")
```

---

## 13. Portfolio / Advanced Roadmaps

> Requires [Advanced Roadmaps for Jira](https://confluence.atlassian.com/jirasoftwareserver/discover-advanced-roadmaps-for-jira-1044784153.html) plugin.

### `portfolioChildrenOf()`
Get portfolio hierarchy children matched by subquery.

```jql
-- All initiatives under Themes with "To Do" status
issueFunction in portfolioChildrenOf("status = 'To Do'") and issuetype = Initiative

-- All children of parents with "To Do" status
issueFunction in portfolioChildrenOf("status = 'To Do'")
```

### `portfolioParentsOf()`
Get portfolio hierarchy parents matched by subquery.

```jql
-- All themes of unresolved epics
issueFunction in portfolioParentsOf("issuetype = Epic and resolution is empty") and issuetype = Themes

-- Themes without any initiative children
issueFunction not in portfolioParentsOf("issuetype = Initiative") and issuetype = Themes
```

---

## 14. Custom JQL Functions (Admin Only)

Administrators can create custom JQL functions using Groovy scripts. Custom functions allow:

- **JQL Aliases**: wrap complex queries behind a simple function name (e.g. `releaseNotes("1.1")`)
- **Custom Value Functions**: return lists of identifiers for entities like versions, users, etc.

Custom functions must:
1. Reside under `com.onresolve.jira.groovy.jql` package
2. Extend `AbstractScriptedJqlFunction`
3. Implement either `JqlQueryFunction` (for issue queries) or `JqlValuesFunction` (for value lists)
4. Be scanned via ScriptRunner → JQL Functions after first creation

```jql
-- Example custom alias function
issueFunction in releaseNotes("1.1")
-- Internally runs: project = JRA AND fixVersion = 1.1 AND affectedVersion = 1.1

-- Example custom value function
fixVersion in versionsStarted()
-- Returns unreleased versions whose start date is in the past
```

---

## Performance Best Practices

1. **Always include a subquery** to limit the scope (e.g. `project = X`, `resolution is empty`)
2. **Recursive functions** can be slow on large instances — use `linkedIssuesOfRecursiveLimited` with a depth
3. **Regex functions** process ~20k issues/sec — narrow down with a project filter
4. **Comments/worklogs** functions scale with total comment count — add date/user filters
5. **Avoid starting regex with wildcards** (`*`, `?`) — causes slow WildcardQueries

---

## Important Notes

1. **Plugin required**: All `issueFunction` queries only work if ScriptRunner is installed and the specific function is enabled by the Jira admin.
2. **Spelling matters**: Link type names are case-sensitive. A misspelled link type returns a validation error with valid names.
3. **Time tracking syntax**: Use `"65h"` or `"3d"` format — never convert to seconds/minutes yourself. E.g. `timespent > "65h"`.
4. **Custom field names in expressions**: Remove spaces (e.g., `BusinessValue` for "Business Value"). Use `customfield_12345` format if the name has punctuation.
5. **Date functions**: `startOfDay()`, `endOfDay()`, `startOfWeek()`, `endOfWeek()`, `startOfMonth()`, `endOfMonth()`, `startOfYear()`, `endOfYear()`, `lastLogin()`, `now()` — all accept optional offset like `startOfMonth(-1)`.
