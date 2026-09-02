# Expense Log

## Google integration setup

Copy `.env.example` to `.env` and provide the values from your Google Cloud project. Keep `.env` outside source control.

1. Create an OAuth 2.0 Web application client and register `${APP_URL}/api/auth/google` as its authorized redirect URI.
2. Enable Google Sheets API and Google Drive API in that project.
3. Create a service account, then share the `ExpenseTracker Database` spreadsheet and the private `ExpenseTracker Receipts` Drive folder with its service-account email.
4. Create the `Users`, `Expenses`, `Categories`, and `Configuration` sheets with the header schemas specified below. `Configuration` uses `section`, `value`, and `active` columns.

The browser only calls TanStack server functions. OAuth secrets, service-account credentials, Sheets IDs, and Drive folder IDs never enter the client bundle.

Build a production-ready internal expense tracking web application based EXACTLY on the attached UI reference images.

IMPORTANT DESIGN REQUIREMENT:
The attached UI images are the absolute visual source of truth.

Do NOT redesign, reinterpret, simplify, modernize, or introduce a different visual language.

I want a 1:1 implementation of the attached designs, including:

* layout
* spacing
* typography hierarchy
* card sizes
* sidebar width
* page widths
* header positioning
* button sizes
* border radius
* shadows
* background colors
* accent colors
* chart positioning
* table layout
* filters
* icons
* labels
* input styling
* whitespace
* alignment
* navigation
* visual density

The finished application should look as close as technically possible to the supplied screenshots when viewed at the same desktop viewport size.

Do not replace the design with a generic SaaS dashboard template.

PROJECT NAME

ExpenseTracker

PURPOSE

This is a simple internal organizational expense-tracking application.

Users should:

1. Sign in using their Google account.
2. Add organizational expenses.
3. Upload receipts as proof of purchase.
4. View all recorded expenses.
5. View their own expenses.
6. View individual expense details.
7. View dashboard analytics.
8. View basic reports.

There is NO complex role or approval system in this version.

Authentication is primarily needed so that the application automatically records who created each expense.

CORE TECHNICAL STACK

Use:

* React
* TypeScript
* Tailwind CSS
* reusable components
* responsive layouts
* server-side API/functions for Google integration
* Google OAuth for authentication
* Google Sheets API for structured application data
* Google Drive API for receipt storage

Do NOT expose Google service credentials, OAuth secrets, spreadsheet credentials, or Drive credentials in client-side JavaScript.

All Google Sheets and Google Drive operations must run securely on the server side.

APPLICATION ROUTES

Create the following routes:

/login

/dashboard

/expenses

/expenses/new

/expenses/:expenseId

/my-expenses

/reports

The authenticated application should use the SAME persistent sidebar/navigation style shown in the attached screenshots.

NAVIGATION

The sidebar should contain:

Dashboard

Expenses

Add Expense

My Expenses

Reports

At the bottom of the sidebar show:

logged-in user name

logged-in user email or avatar

Sign Out

The active navigation item should visually match the highlighted state shown in the supplied design.

---

1. LOGIN PAGE

---

Create a simple login screen that visually feels like part of the same design system.

Do not introduce an unrelated login design.

It should contain:

ExpenseTracker logo/name

Short text:
"Track your organization's expenses in one place."

Primary CTA:

"Continue with Google"

Authentication should use Google OAuth.

After successful login:

* retrieve user's Google ID
* retrieve user's name
* retrieve user's email
* retrieve profile photo if available
* create/update the user in the Users Google Sheet
* establish an authenticated application session
* redirect to /dashboard

Users should never manually choose their identity when creating an expense.

The logged-in user's identity must automatically be attached to every expense.

---

2. DASHBOARD PAGE

---

Reproduce the attached Dashboard design 1:1.

The page must include the same general structure as the reference:

Sidebar

Top page header

Greeting:
"Good afternoon, {firstName}" or appropriate time-based greeting

Current reporting month

Primary action:
"+ Add Expense"

Summary KPI cards:

Total Expenses

This Month

Transactions

If another KPI exists in the source design, reproduce it exactly.

Main analytics areas should include:

Spending Overview

Spending by Category

Recent Expenses

Use actual live data from Google Sheets.

Do NOT hardcode dashboard statistics.

Dashboard metrics should be calculated from Expense records.

TOTAL EXPENSES

Sum all non-deleted expenses.

THIS MONTH

Sum expenses where expense date falls within the current month/year.

TRANSACTIONS

Count non-deleted expenses.

RECENT EXPENSES

Show most recent expenses, including:

description

category

amount

submitted by

date

Use the same visual styling, colors, spacing, tags, avatars, table/card layout, and typography shown in the supplied reference.

SPENDING BY CATEGORY

Aggregate expense totals by category.

SPENDING OVERVIEW

Create the chart shown in the design using real expense data.

Use Recharts or a lightweight charting library.

Chart styling must visually match the reference screenshot.

Do not use default library colors if they conflict with the design.

---

3. ADD EXPENSE PAGE

---

Reproduce the attached Add Expense screen exactly.

Form fields:

Amount

Currency

Date

Description

Category

Subcategory

Department

Vendor

Payment Method

Account

Receipt Upload

Notes

Do NOT add unnecessary form fields.

Automatically populate:

created_by_user_id

created_by_name

created_by_email

created_at

updated_at

The logged-in user should NOT choose "Submitted By."

Use dropdown values populated dynamically from Google Sheets where appropriate.

Categories:
read from Categories sheet.

Departments:
read from Config/Departments data.

Payment Methods:
read from configuration data.

Accounts:
read from configuration data.

CURRENCY

Default:
GHS

Potential values:

GHS
USD
EUR
GBP

DATE

Default to today's date.

AMOUNT

Numeric only.

Must be greater than 0.

DESCRIPTION

Required.

CATEGORY

Required.

RECEIPT

Allow:

JPG

JPEG

PNG

PDF

Recommended maximum upload size:
10 MB

Show a file upload/drop area styled exactly like the reference UI.

Allow the user to preview the selected filename.

SUBMISSION FLOW

When the user clicks Save Expense:

1. Validate the form.
2. Generate a unique expense ID.
3. Upload receipt to Google Drive if supplied.
4. Receive the Google Drive file ID.
5. Save the expense record to Google Sheets.
6. Include the receipt metadata.
7. Show a success message.
8. Redirect to the expense details page.

Prevent duplicate submissions when the button is clicked multiple times.

Use a loading state such as:

"Saving..."

---

4. EXPENSES PAGE

---

Reproduce the attached Expenses list page 1:1.

Include:

Page title

Add Expense button

Search field

Month/date filter

Category filter

Department filter if visible/appropriate

Expense table

Table columns should reflect the reference design and include at minimum:

Date

Description

Category

Amount

Submitted By

Optional:
Vendor

Each row should be clickable.

Clicking the row navigates to:

/expenses/:expenseId

SEARCH

Search across:

description

vendor

category

submitted by

expense ID

FILTERS

Allow filtering by:

month

category

department

submitted user where useful

Use live data from Google Sheets.

Add sensible pagination if needed.

Do not load thousands of spreadsheet rows unnecessarily into the browser.

---

5. EXPENSE DETAILS PAGE

---

Reproduce the attached Expense Details UI exactly.

Display:

Expense ID

Amount

Currency

Description

Date

Category

Subcategory

Department

Vendor

Payment Method

Account

Notes

Submitted By

Submitted By Email

Created At

Updated At

Receipt

The receipt area should include:

receipt thumbnail for image files where practical

PDF icon/preview for PDFs

"View Receipt" action

Viewing a receipt should securely retrieve or open the associated Google Drive file.

Display creator information prominently as shown in the reference.

This is important because the primary accountability requirement is knowing WHO recorded each expense.

EDITING

Provide an Edit action only if visually consistent with the design.

If editing is implemented, maintain:

created_by

created_at

and update:

updated_by

updated_at

Do not change the original creator identity.

---

6. MY EXPENSES PAGE

---

Reproduce the attached My Expenses page exactly.

This page only displays expenses created by the currently logged-in user.

Determine this using:

created_by_user_id

or

created_by_email

Do not rely on frontend-only filtering.

Filter data securely on the server.

Show summary cards such as:

Total Submitted

This Month

Transactions

Then display the user's expenses using the same visual language as the Expenses page.

Include:

search

month filtering

category filtering

---

7. REPORTS PAGE

---

Reproduce the attached Reports screen exactly.

Use actual Google Sheets data.

Reports should include:

Total spend

Monthly spending

Spending by category

Spending by department

Top categories

Transaction count

Monthly expense trend

Category breakdown

Use the same card and chart styling shown in the attached design.

Allow filters:

Month

Year

Category where useful

Optional download functionality:

CSV export

The Reports page should NOT introduce a completely new UI language.

It must remain visually consistent with all reference screenshots.

---

## GOOGLE SHEETS INTEGRATION

Google Sheets is the primary structured data store for this MVP.

Create/use one Google Spreadsheet.

Recommended spreadsheet name:

ExpenseTracker Database

Use separate worksheets/tabs:

Users

Expenses

Categories

Budgets

Configuration

---

## USERS SHEET

Columns:

user_id

google_user_id

name

email

profile_photo_url

created_at

last_login_at

status

Do NOT store passwords.

Google authentication handles login.

---

## EXPENSES SHEET

Use the following columns:

expense_id

expense_date

description

category

subcategory

amount

currency

department

vendor

payment_method

account

receipt_file_id

receipt_url

receipt_filename

receipt_mime_type

created_by_user_id

created_by_name

created_by_email

created_at

updated_by_user_id

updated_at

is_deleted

deleted_by

deleted_at

Each expense_id must be unique.

Example expense ID:

EXP-20260831-0042

Do not use spreadsheet row number as the permanent primary key.

---

## CATEGORIES SHEET

Columns:

category_id

category_name

subcategory_name

active

Example:

CAT-001 | Food | Meals | TRUE

CAT-002 | Transport | Fuel | TRUE

CAT-003 | Office Supplies | Stationery | TRUE

---

## BUDGETS SHEET

Columns:

budget_id

month

year

category

department

budget_amount

currency

created_at

updated_at

Budgets are primarily for dashboard/reporting calculations in this MVP.

---

## CONFIGURATION SHEET

Use this sheet for configurable values.

Potential columns/sections:

Departments

Payment Methods

Accounts

Currencies

Expense types if required

Do not hardcode these values throughout the frontend if they are configurable.

---

## GOOGLE SHEETS API BEHAVIOR

All Google Sheets operations should happen through secure server-side functions/API routes.

Required server operations:

getCurrentUser

getExpenses

getExpenseById

createExpense

updateExpense

softDeleteExpense

getMyExpenses

getCategories

getConfiguration

getBudgets

getDashboardMetrics

getReportMetrics

Use batch reads wherever practical to reduce Google API calls.

Use caching for configuration data where appropriate.

Never send Google API credentials to the browser.

---

## GOOGLE DRIVE RECEIPT INTEGRATION

Receipts must be stored in Google Drive.

Do NOT store image binaries or PDFs directly in Google Sheets.

Recommended Drive structure:

ExpenseTracker Receipts

2026

January

February

March

April

May

June

July

August

September

October

November

December

When an expense is created:

1. Generate the expense ID.
2. Upload the receipt.
3. Rename the receipt using a predictable convention.

Example:

EXP-20260831-0042_Prince-Keteni_450-GHS.jpg

4. Upload to the correct year/month folder.
5. Store the following in Google Sheets:

receipt_file_id

receipt_url

receipt_filename

receipt_mime_type

Do not make receipts publicly accessible by default.

Use organization/private permissions.

If the app needs to display a receipt, retrieve it securely using the backend.

If Google Workspace Shared Drives are available, support storing receipts inside a Shared Drive.

---

## GOOGLE AUTHENTICATION

Use Google OAuth.

At login retrieve:

Google user ID

name

email

profile image

If this is an organizational Google Workspace app, optionally restrict authentication to the organization's allowed email domain.

Example configurable setting:

ALLOWED_EMAIL_DOMAIN=company.com

If no domain restriction is configured, allow authenticated users according to the OAuth configuration.

On each login:

Check whether the user's Google ID/email exists in the Users sheet.

If not:

create user.

If yes:

update last_login_at.

Maintain a secure application session.

Do not rely on email passed from the frontend as proof of identity.

Always use the authenticated session on the backend.

---

## SECURITY REQUIREMENTS

Never expose:

Google service account keys

Google OAuth client secret

Google Drive credentials

Google Sheets credentials

server secrets

in client-side code.

All create/update/delete actions must verify an authenticated session.

Validate all input server-side.

Sanitize user-provided text.

Validate uploaded MIME type.

Validate uploaded file size.

Use HTTPS.

Use environment variables for secrets.

Do NOT store passwords in Google Sheets.

Do NOT allow users to manually change created_by values.

---

## SOFT DELETE

Do not permanently remove financial transactions from Google Sheets.

When an expense is deleted:

is_deleted = TRUE

deleted_by = current user ID/email

deleted_at = timestamp

Exclude soft-deleted expenses from:

dashboard totals

expense lists

my expenses

reports

unless explicitly requested.

---

## AUDIT INFORMATION

Every expense must contain:

created_by_user_id

created_by_name

created_by_email

created_at

updated_by_user_id

updated_at

This information should always come from the authenticated session where applicable.

Users must never manually type their creator identity.

---

## DESIGN SYSTEM

The attached screenshots define the design system.

Extract and reproduce their styles.

Pay special attention to:

Navigation sidebar

Dark navy background

Sidebar text/icon treatment

Primary green accent

Off-white/light gray page background

White cards

Border radiuses

Light borders

Muted secondary text

Typography

Button styling

Pills/tags

Form field height

Table row spacing

Chart colors

Header size

Section title hierarchy

Card shadows

Avatar styling

Do not randomly substitute colors.

Define reusable CSS variables/design tokens after inspecting the reference screenshots.

Example structure:

--sidebar-bg

--sidebar-active

--primary

--page-bg

--card-bg

--text-primary

--text-secondary

--border

--success

--warning

--danger

Determine the actual values by visually matching the provided designs.

---

## PIXEL-PERFECT REQUIREMENT

Use the attached images as reference images during implementation.

Compare each finished screen against its corresponding screenshot.

Match:

sidebar dimensions

content starting position

maximum page width

spacing between sections

padding inside cards

font sizes

line heights

button dimensions

input dimensions

icon placement

chart height

table column widths

border radiuses

shadows

background

Every page should feel like it was implemented directly from the screenshot, not merely inspired by it.

DESKTOP FIRST

Implement the exact reference view first at approximately the viewport size used in the screenshots.

Then add responsive behavior without changing the desktop design.

---

## RESPONSIVE BEHAVIOR

Desktop:
match screenshots 1:1.

Tablet:
collapse/reduce sidebar where necessary.

Mobile:
use a mobile navigation drawer.

Cards should stack.

Tables may become horizontally scrollable.

Forms should become single column.

Do not damage the desktop layout in order to achieve mobile responsiveness.

---

## LOADING STATES

Add polished loading states for:

dashboard

expense list

reports

expense details

expense submission

receipt upload

Prefer skeleton components that preserve the same layout instead of generic spinners everywhere.

---

## EMPTY STATES

Provide clean empty states such as:

"No expenses recorded yet."

CTA:

"Add your first expense"

Keep empty states consistent with the reference design.

---

## ERROR HANDLING

Display clear user-facing errors for:

Google Sheets unavailable

Google Drive upload failure

invalid file

expense save failure

authentication failure

network failure

Do not expose server stack traces.

---

## PERFORMANCE

Avoid unnecessarily fetching entire Google Sheets repeatedly.

Cache:

categories

configuration

budgets where appropriate

Use server-side filtering/processing for expense data when practical.

Debounce search.

Prevent unnecessary dashboard reloads.

---

## ENVIRONMENT VARIABLES

Prepare configuration for variables such as:

GOOGLE_CLIENT_ID

GOOGLE_CLIENT_SECRET

GOOGLE_SERVICE_ACCOUNT_EMAIL

GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY

GOOGLE_SPREADSHEET_ID

GOOGLE_DRIVE_RECEIPTS_FOLDER_ID

GOOGLE_SHARED_DRIVE_ID

ALLOWED_EMAIL_DOMAIN

APP_URL

Do not hardcode secrets.

Provide a .env.example structure without exposing real credentials.

---

## IMPORTANT GOOGLE ACCOUNT MODEL

Keep these concepts separate:

USER IDENTITY

Google OAuth identifies who is using the application.

Example:

Prince Keteni

[prince@company.com](mailto:prince@company.com)

SYSTEM ACCESS

The backend/service identity performs Google Sheets and Google Drive operations.

Users should not require direct edit access to the master ExpenseTracker spreadsheet.

The web application is the primary interface.

---

## APPLICATION FLOW

LOGIN

User clicks Continue with Google

↓

Google verifies identity

↓

Backend creates session

↓

User record is created/updated

↓

Dashboard

CREATE EXPENSE

User opens Add Expense

↓

Completes form

↓

Adds receipt

↓

Clicks Save Expense

↓

Backend validates user and form

↓

Expense ID generated

↓

Receipt uploaded to Google Drive

↓

Receipt Drive metadata returned

↓

Expense appended to Google Sheets

↓

Creator information automatically attached

↓

Success

↓

Expense Details page

DASHBOARD

Dashboard loads

↓

Backend reads expense data

↓

Deleted expenses excluded

↓

Metrics calculated

↓

Charts populated

↓

Recent expenses returned

MY EXPENSES

Authenticated session

↓

Backend determines current user

↓

Returns only expenses where:

created_by_user_id = current user

---

## SAMPLE DATA

Use realistic Ghana-based sample data during development.

Currency:
GHS

Examples:

Office stationery — GHS 450

Uber to client meeting — GHS 85

Internet subscription — GHS 600

Marketing materials — GHS 1,250

Team lunch — GHS 720

Use sample names only during development.

Once Google data exists, use live data.

---

## DO NOT DO THE FOLLOWING

Do NOT:

redesign the attached UI

use a generic admin template

change the sidebar layout

create a completely different color palette

add unnecessary roles

add an approval workflow

add complex accounting features

store passwords in Sheets

store receipt binaries in Sheets

expose service-account credentials

allow direct frontend access to protected Google APIs

allow the user to manually choose who submitted an expense

permanently delete financial records

make receipts publicly accessible by default

hardcode dashboard numbers

---

## ACCEPTANCE CRITERIA

The project is complete when:

1. Every supplied UI screenshot has been replicated as an individual page.

2. The dashboard visually matches the attached dashboard screenshot as closely as technically possible.

3. Add Expense visually matches its attached screenshot.

4. Expenses visually matches its attached screenshot.

5. Expense Details visually matches its attached screenshot.

6. My Expenses visually matches its attached screenshot.

7. Reports visually matches its attached screenshot.

8. Navigation between all pages works.

9. Google login works.

10. The application automatically knows which authenticated user created an expense.

11. Creating an expense adds a correct row to Google Sheets.

12. Uploading a receipt saves it to Google Drive.

13. The corresponding Google Drive file ID/link is stored with the expense.

14. Dashboard statistics come from Google Sheets.

15. Reports come from Google Sheets.

16. My Expenses only shows expenses created by the logged-in user.

17. Search and filters work.

18. Expense details retrieve the correct spreadsheet record.

19. Receipt viewing works.

20. Sensitive Google credentials are only used server-side.

21. Errors and loading states are handled cleanly.

22. The desktop implementation visually matches the supplied designs before responsive variations are introduced.

---

## IMPLEMENTATION APPROACH

Before writing the application:

Step 1:
Analyze every attached screenshot carefully.

Step 2:
Identify shared design tokens and components.

Step 3:
Create the global application shell/sidebar.

Step 4:
Implement each page from the visual reference.

Step 5:
Compare every page visually with its corresponding screenshot and fix spacing/layout discrepancies.

Step 6:
Implement Google OAuth.

Step 7:
Implement Google Sheets integration.

Step 8:
Implement Google Drive receipt upload.

Step 9:
Replace static sample values with live Google data.

Step 10:
Test complete end-to-end workflows.

Do not stop after creating static screens.

The final project must be a functional application connected to Google services.

---

## FINAL PRODUCT PRINCIPLE

Users should experience this as a normal polished web application.

They should not need to know that Google Sheets is being used behind the scenes.

Google Sheets acts as the structured data layer.

Google Drive stores receipts.

Google Authentication identifies users.

The web interface is the actual product.

The finished result should visually reproduce the supplied ExpenseTracker designs 1:1 while being fully functional end-to-end.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/88c9e958-b912-4cde-b757-81e3630f5572).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
