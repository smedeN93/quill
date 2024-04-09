import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { TRPCError } from "@trpc/server";
import * as z from "zod";

import { db } from "@/db";

import { privateProcedure, procedure, router } from "./trpc";

export const appRouter = router({
  authCallback: procedure.query(async () => {
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    if (!user || !user.id || !user.email)
      throw new TRPCError({ code: "UNAUTHORIZED" });

    // check if user is in the database
    const dbUser = await db.user.findUnique({
      where: {
        id: user.id,
      },
    });

    if (!dbUser) {
      // create user in db
      await db.user.create({
        data: {
          id: user.id,
          email: user.email,
        },
      });
    }

    return {
      success: true,
    };
  }),
  getUserFiles: privateProcedure.query(async ({ ctx }) => {
    const { userId } = ctx;

    return await db.file.findMany({
      where: {
        userId,
      },
    });
  }),
  deleteFile: privateProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx;

      const file = await db.file.delete({
        where: {
          id: input.id,
          userId,
        },
      });

      if (!file) throw new TRPCError({ code: "NOT_FOUND" });

      return file;
    }),
});

export type AppRouter = typeof appRouter;
