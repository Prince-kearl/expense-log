import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CoinTrail — Team Expense Tracking" },
      { name: "description", content: "Manage your team's expenses and receipts with CoinTrail." },
      { property: "og:title", content: "CoinTrail — Team Expense Tracking" },
      { property: "og:description", content: "Manage your team's expenses and receipts with CoinTrail." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});
