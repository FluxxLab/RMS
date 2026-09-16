"use server";

import { revalidatePath } from "next/cache";
import { apiMessage, submitScreening } from "@/lib/api";

export async function answerScreening(
  studyId: string,
  answers: { questionId: string; optionId: string }[],
): Promise<{ ok: true; status: string } | { ok: false; message: string }> {
  const result = await submitScreening(studyId, answers);
  if (!result.ok) return { ok: false, message: apiMessage(result.error) };

  revalidatePath("/screening");
  return { ok: true, status: result.data.status };
}
