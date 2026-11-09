import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { searchExpenses } from "./expense-search.server";

export const findExpenses = createServerFn({ method: "POST" })
  .inputValidator((input: { query: string }) => {
    if (typeof input?.query !== "string") throw new Error("Enter an expense description.");
    return { query: input.query };
  })
  .handler(({ data }) => searchExpenses(getRequest(), data.query));