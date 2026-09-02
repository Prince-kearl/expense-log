import { createFileRoute } from "@tanstack/react-router";
import { getExpensesFromSheet, getReceiptFile } from "@/lib/google.server";
import { readCookie, readSession } from "@/lib/session.server";

export const Route = createFileRoute("/api/receipts/$fileId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const user = await readSession(readCookie(request, "expense_tracker_session"));
        if (!user) return new Response("Unauthorized", { status: 401 });
        const expenses = await getExpensesFromSheet();
        if (!expenses.some((expense) => expense.receipt_file_id?.split(",").includes(params.fileId))) {
          return new Response("Receipt not found", { status: 404 });
        }
        const receipt = await getReceiptFile(params.fileId);
        return new Response(receipt.body, {
          headers: {
            "content-type": receipt.headers.get("content-type") ?? "application/octet-stream",
            "content-disposition": "inline",
            "cache-control": "private, no-store",
          },
        });
      },
    },
  },
});