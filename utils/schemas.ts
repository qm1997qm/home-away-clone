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

export const propertySchema = z.object({
    name: z
        .string()
        .min(2, { message: "name must be at least 2 characters" })
        .max(100, { message: "name must be less than 100 characters" }),
    tagline: z
        .string()
        .min(2, { message: "tagline must be at least 2 characters" })
        .max(100, { message: "tagline must be less than 100 characters" }),
    price: z.coerce.number().int().min(0, {
        message: "price must be a positive number.",
    }),
    category: z.string(),
    description: z.string().refine(
        (description) => {
            const wordCount = description.split(" ").length;
            return wordCount >= 10 && wordCount <= 1000;
        },
        {
            message: "description must be between 10 and 1000 words.",
        }
    ),
    country: z.string(),
    guests: z.coerce.number().int().min(0, {
        message: "guest amount must be a positive number.",
    }),
    bedrooms: z.coerce.number().int().min(0, {
        message: "bedrooms amount must be a positive number.",
    }),
    beds: z.coerce.number().int().min(0, {
        message: "beds amount must be a positive number.",
    }),
    baths: z.coerce.number().int().min(0, {
        message: "bahts amount must be a positive number.",
    }),
    amenities: z.string(),
});
