import * as z from "zod";
import { ZodSchema } from "zod";

export function validatedWithZodSchema<T>(
    schema: ZodSchema<T>,
    data: unknown
): T {
    const result = schema.safeParse(data);
    if (!result.success) {
        const error = result.error.errors.map((error) => error.message);
        throw new Error(error.join(","));
    }

    return result.data;
}

export const profileSchema = z.object({
    // firstName: z.string().max(5, { message: 'max length is 5' }),
    firstName: z.string(),
    lastName: z.string(),
    username: z.string(),
});

export const imageSchema = z.object({
    image: validateFile(),
});

function validateFile() {
    const maxUploadFile = 1024 * 1024;
    const acceptedFileTypes = ["image/"];
    return z
        .instanceof(File)
        .refine((file) => {
            return !file || file.size <= maxUploadFile;
        }, "File size must be than 1MB")
        .refine((file) => {
            return (
                !file ||
                acceptedFileTypes.some((type) => file.type.startsWith(type))
            );
        }, "File must be an image");
}
