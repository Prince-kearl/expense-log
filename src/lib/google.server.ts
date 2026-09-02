import type { AppUser, Expense } from "./expenses";

type GoogleConfig = {
  clientId: string;
  clientSecret: string;
  serviceAccountEmail: string;
  serviceAccountPrivateKey: string;
  spreadsheetId: string;
  receiptsFolderId: string;
  appUrl: string;
  allowedDomain?: string;
};

const EXPENSE_HEADERS = [
  "expense_id", "expense_date", "description", "category", "subcategory", "amount", "currency",
  "department", "vendor", "payment_method", "account", "receipt_file_id", "receipt_url",
  "receipt_filename", "receipt_mime_type", "created_by_user_id", "created_by_name",
  "created_by_email", "created_at", "updated_by_user_id", "updated_at", "is_deleted",
  "deleted_by", "deleted_at",
] as const;

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Google integration is not configured: ${name} is missing.`);
  return value;
}

export function getGoogleConfig(): GoogleConfig {
  const allowedDomain = process.env["ALLOWED_EMAIL_DOMAIN"];
  return {
    clientId: required("GOOGLE_CLIENT_ID"),
    clientSecret: required("GOOGLE_CLIENT_SECRET"),
    serviceAccountEmail: required("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
    serviceAccountPrivateKey: required("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY").replace(/\\n/g, "\n"),
    spreadsheetId: required("GOOGLE_SPREADSHEET_ID"),
    receiptsFolderId: required("GOOGLE_DRIVE_RECEIPTS_FOLDER_ID"),
    appUrl: required("APP_URL").replace(/\/$/, ""),
    ...(allowedDomain ? { allowedDomain } : {}),
  };
}

function base64Url(value: string | Uint8Array) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function serviceAccessToken() {
  const config = getGoogleConfig();
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64Url(JSON.stringify({
    iss: config.serviceAccountEmail,
    scope: "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }))}`;
  const pem = config.serviceAccountPrivateKey
    .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const der = Uint8Array.from(atob(pem), (character) => character.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${base64Url(new Uint8Array(signature))}`,
    }),
  });
  const payload = (await response.json()) as { access_token?: string; error_description?: string };
  if (!response.ok || !payload.access_token) throw new Error(payload.error_description ?? "Google service authentication failed.");
  return payload.access_token;
}

async function googleFetch(url: string, init: RequestInit = {}) {
  const token = await serviceAccessToken();
  const response = await fetch(url, {
    ...init,
    headers: { authorization: `Bearer ${token}`, ...init.headers },
  });
  if (!response.ok) throw new Error(`Google request failed (${response.status}).`);
  return response;
}

function sheetRange(sheet: string) {
  return encodeURIComponent(`${sheet}!A:Z`);
}

async function sheetRows(sheet: string) {
  const { spreadsheetId } = getGoogleConfig();
  const response = await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetRange(sheet)}`);
  return ((await response.json()) as { values?: string[][] }).values ?? [];
}

function expenseFromRow(row: string[]): Expense {
  const item = Object.fromEntries(EXPENSE_HEADERS.map((header, index) => [header, row[index] ?? ""]));
  return {
    ...item,
    amount: Number(item["amount"]),
    receipt_file_id: item["receipt_file_id"] || null,
    receipt_url: item["receipt_url"] || null,
    receipt_filename: item["receipt_filename"] || null,
    receipt_mime_type: item["receipt_mime_type"] || null,
    updated_by_user_id: item["updated_by_user_id"] || null,
    is_deleted: item["is_deleted"]?.toLowerCase() === "true",
  } as Expense;
}

export async function getExpensesFromSheet() {
  const rows = await sheetRows("Expenses");
  return rows.slice(1).map(expenseFromRow).filter((expense) => !expense.is_deleted);
}

export async function getApplicationConfiguration() {
  const [categoryRows, configurationRows] = await Promise.all([sheetRows("Categories"), sheetRows("Configuration")]);
  const categories = categoryRows.slice(1).reduce<Record<string, string[]>>((result, row) => {
    if (row[3]?.toLowerCase() !== "true" || !row[1] || !row[2]) return result;
    (result[row[1]] ??= []).push(row[2]);
    return result;
  }, {});
  const valuesFor = (section: string) => configurationRows
    .slice(1)
    .filter((row) => row[0] === section && row[2]?.toLowerCase() !== "false")
    .map((row) => row[1])
    .filter((value): value is string => Boolean(value));
  return {
    categories: Object.entries(categories).map(([category, subcategories]) => ({ category, subcategories })),
    departments: valuesFor("Departments"),
    paymentMethods: valuesFor("Payment Methods"),
    accounts: valuesFor("Accounts"),
    currencies: valuesFor("Currencies"),
  };
}

export async function createCategoryInSheet(categoryName: string, subcategoryName: string) {
  const { spreadsheetId } = getGoogleConfig();
  const rows = await sheetRows("Categories");
  const duplicate = rows.slice(1).some(
    (row) => row[1]?.toLowerCase() === categoryName.toLowerCase() && row[2]?.toLowerCase() === subcategoryName.toLowerCase(),
  );
  if (duplicate) throw new Error("That category and subcategory already exist.");
  const categoryId = `CAT-${String(rows.length).padStart(3, "0")}`;
  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent("Categories!A:D")}:append?valueInputOption=USER_ENTERED`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ values: [[categoryId, categoryName, subcategoryName, "TRUE"]] }),
    },
  );
  return { category: categoryName, subcategory: subcategoryName };
}

export async function appendExpenseToSheet(expense: Expense) {
  const { spreadsheetId } = getGoogleConfig();
  const values = [EXPENSE_HEADERS.map((header) => {
    const value = expense[header as keyof Expense];
    return value == null ? "" : String(value);
  })];
  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent("Expenses!A:Z")}:append?valueInputOption=USER_ENTERED`,
    { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ values }) },
  );
}

export async function upsertGoogleUser(googleUser: {
  id: string;
  name: string;
  email: string;
  picture?: string;
}) {
  const config = getGoogleConfig();
  if (config.allowedDomain && !googleUser.email.endsWith(`@${config.allowedDomain}`)) {
    throw new Error("This Google account is not permitted to access ExpenseTracker.");
  }
  const rows = await sheetRows("Users");
  const now = new Date().toISOString();
  const existingIndex = rows.slice(1).findIndex((row) => row[1] === googleUser.id || row[3] === googleUser.email);
  const user: AppUser = {
    user_id: existingIndex >= 0 ? rows[existingIndex + 1]?.[0] || `USR-${googleUser.id}` : `USR-${googleUser.id}`,
    name: googleUser.name,
    email: googleUser.email,
    profile_photo_url: googleUser.picture ?? null,
  };
  const values = [[user.user_id, googleUser.id, user.name, user.email, user.profile_photo_url ?? "", existingIndex >= 0 ? rows[existingIndex + 1]?.[5] ?? now : now, now, "active"]];
  const range = existingIndex >= 0 ? `Users!A${existingIndex + 2}:H${existingIndex + 2}` : "Users!A:H";
  const method = existingIndex >= 0 ? "PUT" : "POST";
  const endpoint = existingIndex >= 0
    ? `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`
    : `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;
  await googleFetch(endpoint, { method, headers: { "content-type": "application/json" }, body: JSON.stringify({ values }) });
  return user;
}

export async function uploadReceipt(expenseId: string, userName: string, file: File, sequence = 1) {
  if (!["image/jpeg", "image/png", "application/pdf"].includes(file.type) || file.size > 10 * 1024 * 1024) {
    throw new Error("Receipts must be a JPG, PNG, or PDF no larger than 10 MB.");
  }
  const { receiptsFolderId } = getGoogleConfig();
  const extension = file.name.split(".").pop() ?? "file";
  const suffix = sequence > 1 ? `_${sequence}` : "";
  const metadata = { name: `${expenseId}_${userName.replace(/\s+/g, "-")}${suffix}.${extension}`, parents: [receiptsFolderId] };
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", file, metadata.name);
  const response = await googleFetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink", { method: "POST", body: form });
  return (await response.json()) as { id: string; name: string; mimeType: string; webViewLink?: string };
}

export async function getReceiptFile(fileId: string) {
  return googleFetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
  );
}