import { createFileRoute } from "@tanstack/react-router";
import { getExpenseForTeam, getReceiptObject } from "@/lib/supabase-expenses.server";
import { readCookie, readSession } from "@/lib/session.server";

export const Route = createFileRoute("/api/receipts/$expenseId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const user = await readSession(readCookie(request, "expense_tracker_session"));
        if (!user) return new Response("Unauthorized", { status: 401 });

        const expense = await getExpenseForTeam(user.team_id, params.expenseId);
        if (!expense) return new Response("Receipt not found", { status: 404 });

        const requestedPath = new URL(request.url).searchParams.get("path") ?? expense.receipts[0]?.path;
        const receipt = requestedPath ? expense.receipts.find((r) => r.path === requestedPath) : undefined;
        if (!receipt) return new Response("Receipt not found", { status: 404 });

        const blob = await getReceiptObject(receipt.path);
        return new Response(blob, {
          headers: {
            "content-type": receipt.mime_type || "application/octet-stream",
            "content-disposition": "inline",
            "cache-control": "private, no-store",
          },
        });
      },
    },
  },
});
