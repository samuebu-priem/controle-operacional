import { AppError } from "./errorHandler.js";
export function validateBody(input, validator) {
    try {
        return validator(input);
    }
    catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        throw new AppError("Payload inválido", 400, "BAD_REQUEST", {
            reason: error instanceof Error ? error.message : "validation_failed"
        });
    }
}
