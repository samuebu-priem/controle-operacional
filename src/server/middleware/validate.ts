import { AppError } from "./errorHandler.js";

export type Validator<T> = (input: unknown) => T;

export function validateBody<T>(input: unknown, validator: Validator<T>): T {
  try {
    return validator(input);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("Payload inválido", 400, "BAD_REQUEST", {
      reason: error instanceof Error ? error.message : "validation_failed"
    });
  }
}
