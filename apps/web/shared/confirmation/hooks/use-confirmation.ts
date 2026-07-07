import { requestConfirmation } from "../store";
import { ConfirmationOptions } from "../types";

export function useConfirmation() {
  return (options: ConfirmationOptions) => requestConfirmation(options);
}
