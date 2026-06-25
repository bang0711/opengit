import { toast } from "sonner";

export type ActionResult = { error?: string } | undefined;

/** Toast the outcome of a server action: its error, or a success message. */
export function notify(result: ActionResult, success: string): void {
  if (result && "error" in result && result.error) {
    toast.error(result.error);
  } else {
    toast.success(success);
  }
}
