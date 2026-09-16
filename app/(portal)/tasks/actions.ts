"use server";

import { revalidatePath } from "next/cache";
import { apiMessage, submitTask } from "@/lib/api";

export async function answerTask(
  bookingId: string,
  answers: { questionId: string; optionId?: string; text?: string }[],
): Promise<{ ok: true } | { ok: false; message: string }> {
  const result = await submitTask(bookingId, answers);
  if (!result.ok) return { ok: false, message: apiMessage(result.error) };

  revalidatePath("/tasks");
  return { ok: true };
}
