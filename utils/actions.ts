"use server";

import { clerkClient, currentUser } from "@clerk/nextjs/server";
import {
    imageSchema,
    profileSchema,
    propertySchema,
    validatedWithZodSchema,
} from "./schemas";
import { redirect } from "next/navigation";
import db from "./db";
import { revalidatePath } from "next/cache";
import { uploadImage } from "./supabase";

const getAuthUser = async () => {
    const user = await currentUser();
    if (!user) {
        throw new Error("You must be logged in to access this route");
    }
    if (!user.privateMetadata.hasProfile) redirect("/profile/create");
    return user;
};

const renderError = async (error: unknown) => {
    console.log(error);
    return {
        message: error instanceof Error ? error.message : "An error occurred",
    };
};

export const createProfileAction = async (
    prevState: any,
    formData: FormData
) => {
    try {
        const user = await currentUser();
        if (!user) throw new Error("Please login to create a profile");

        const rawData = Object.fromEntries(formData);
        const validatedFields = validatedWithZodSchema(profileSchema, rawData);

        await db.profile.create({
            data: {
                clerkId: user.id,
                email: user.emailAddresses[0].emailAddress,
                profileImage: user.imageUrl ?? "",
                ...validatedFields,
            },
        });

        await clerkClient.users.updateUserMetadata(user.id, {
            privateMetadata: {
                hasProfile: true,
            },
        });
    } catch (error) {
        console.log(error);
        return renderError(error);
    }
    redirect("/");
};

export const fetchProfileImage = async () => {
    const user = await currentUser();
    if (!user) return null;

    const profile = await db.profile.findUnique({
        where: {
            clerkId: user.id,
        },
        select: {
            profileImage: true,
        },
    });

    return profile?.profileImage;
};

export const fetchProfile = async () => {
    const user = await getAuthUser();

    const profile = await db.profile.findUnique({
        where: {
            clerkId: user.id,
        },
    });

    if (!profile) redirect("/profile/create");

    return profile;
};

export const updateProfileAction = async (
    prevState: any,
    formData: FormData
): Promise<{ message: string }> => {
    try {
        const user = await getAuthUser();

        const rawData = Object.fromEntries(formData);
        const validatedFields = validatedWithZodSchema(profileSchema, rawData);

        await db.profile.update({
            where: {
                clerkId: user.id,
            },
            data: validatedFields,
        });

        revalidatePath("/profile");
        return { message: "update profile successfully" };
    } catch (error) {
        return renderError(error);
    }
};

export const updateProfileImageAction = async (
    prevState: any,
    formData: FormData
): Promise<{ message: string }> => {
    try {
        const user = await getAuthUser();

        const image = formData.get("image") as File;
        const validatedFields = validatedWithZodSchema(imageSchema, { image });
        const fullPath = await uploadImage(validatedFields.image);

        await db.profile.update({
            where: {
                clerkId: user.id,
            },
            data: {
                profileImage: fullPath,
            },
        });
    } catch (error) {
        return renderError(error);
    }
    revalidatePath("/profile");
    return { message: "Profile image updated successfully" };
};

// ### createPropertyAction
export const createPropertyAction = async (
    prevState: any,
    formData: FormData
): Promise<{ message: string }> => {
    try {
        const user = await getAuthUser();

        const rawData = Object.fromEntries(formData);
        const file = formData.get("image") as File;

        const validatedFields = validatedWithZodSchema(propertySchema, rawData);
        const validatedFile = validatedWithZodSchema(imageSchema, {
            image: file,
        });
        const fullPath = await uploadImage(validatedFile.image);

        await db.property.create({
            data: {
                ...validatedFields,
                image: fullPath,
                profileId: user.id,
            },
        });
    } catch (error) {
        return renderError(error);
    }
    redirect("/");
};

// ### fetchProperties
export const fetchProperties = async ({
    search = "",
    category,
}: {
    category?: string;
    search?: string;
}) => {
    const properties = await db.property.findMany({
        where: {
            category,
            OR: [
                { name: { contains: search, mode: "insensitive" } },
                { tagline: { contains: search, mode: "insensitive" } },
            ],
        },
        select: {
            id: true,
            name: true,
            tagline: true,
            country: true,
            image: true,
            price: true,
        },
    });
    return properties;
};
