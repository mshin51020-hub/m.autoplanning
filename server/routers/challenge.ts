import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getChallengesByUserId, createChallenge, deleteChallenge, markChallengeCompleted, computeChallengeProgress } from "../db";

export const challengeRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const list = await getChallengesByUserId(ctx.user.id);
    return Promise.all(
      list.map(async (c) => ({
        ...c,
        currentValue: await computeChallengeProgress(c, ctx.user.id),
      }))
    );
  }),

  create: protectedProcedure
    .input(z.object({
      type:         z.enum(["streak", "pr", "monthly_sessions", "total_volume"]),
      title:        z.string().min(1).max(255),
      targetValue:  z.number().positive(),
      exerciseName: z.string().max(255).optional(),
      startDate:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }))
    .mutation(async ({ ctx, input }) => {
      await createChallenge({ userId: ctx.user.id, ...input });
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteChallenge(input.id, ctx.user.id);
      return { success: true };
    }),

  complete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await markChallengeCompleted(input.id, ctx.user.id);
      return { success: true };
    }),
});
