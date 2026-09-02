import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/signout")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        return new Response(null, {
          headers: {
            location: new URL("/login", url).toString(),
            "set-cookie": `expense_tracker_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${url.protocol === "https:" ? "; Secure" : ""}`,
          },
          status: 302,
        });
      },
    },
  },
});