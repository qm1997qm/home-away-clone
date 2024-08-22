"use server";

import { clerkClient, currentUser } from "@clerk/nextjs/server";
import {
    createReviewSchema,
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

// ### fetchFavorite

export const fetchFavoriteId = async ({
    propertyId,
}: {
    propertyId: string;
}) => {
    const user = await getAuthUser();
    const favorite = await db.favorite.findFirst({
        where: {
            propertyId,
            profileId: user.id,
        },
        select: {
            id: true,
        },
    });

    return favorite?.id || null;
};

export const toggleFavoriteAction = async (prevState: {
    propertyId: string;
    favoriteId: string | null;
    pathname: string;
}) => {
    const user = await getAuthUser();
    const { pathname, favoriteId, propertyId } = prevState;
    try {
        if (favoriteId) {
            await db.favorite.delete({
                where: {
                    id: favoriteId,
                },
            });
        } else {
            await db.favorite.create({
                data: {
                    propertyId,
                    profileId: user.id,
                },
            });
        }
        revalidatePath(pathname);
        return {
            message: favoriteId ? "Removed from Faves" : "Added from Faves",
        };
    } catch (error) {
        return renderError(error);
    }
};

// ### fetchFavorites
export const fetchFavorites = async () => {
    const user = await getAuthUser();
    const favorites = await db.favorite.findMany({
        where: {
            profileId: user.id,
        },
        select: {
            property: {
                select: {
                    id: true,
                    name: true,
                    tagline: true,
                    price: true,
                    country: true,
                    image: true,
                },
            },
        },
    });

    return favorites.map((favorite) => favorite.property);
};

// ### fetchPropertyDetails
export const fetchPropertyDetails = async (id: string) => {
    const property = await db.property.findUnique({
        where: {
            id,
        },
        include: {
            profile: true,
            bookings: {
                select: {
                    checkIn: true,
                    checkOut: true,
                },
            },
        },
    });
    return property;
};

// Review
export const createReviewAction = async (
    prevState: any,
    formData: FormData
) => {
    try {
        const user = await getAuthUser();
        const rawData = Object.fromEntries(formData);
        const validatedFields = validatedWithZodSchema(
            createReviewSchema,
            rawData
        );

        await db.review.create({
            data: {
                ...validatedFields,
                profileId: user.id,
            },
        });
        revalidatePath(`/properties/${validatedFields.propertyId}`);
        return { message: "Review submitted successfully" };
    } catch (error) {
        return renderError(error);
    }
};
export const fetchPropertyReviews = async (propertyId: string) => {
    const reviews = await db.review.findMany({
        where: {
            propertyId,
        },
        select: {
            id: true,
            rating: true,
            comment: true,
            profile: {
                select: {
                    firstName: true,
                    profileImage: true,
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });
    return reviews;
};
export const fetchPropertyReviewsByUser = async () => {
    const user = await getAuthUser();
    const reviews = await db.review.findMany({
        where: {
            profileId: user.id,
        },
        select: {
            id: true,
            rating: true,
            comment: true,
            property: {
                select: {
                    name: true,
                    image: true,
                },
            },
        },
    });
    return reviews;
};
export const deleteReviewAction = async (prevState: { reviewId: string }) => {
    const { reviewId } = prevState;
    try {
        const user = await getAuthUser();
        await db.review.delete({
            where: {
                id: reviewId,
                profileId: user.id,
            },
        });
        revalidatePath("/reviews");
        return { message: "Review deleted successfully" };
    } catch (error) {
        return renderError(error);
    }
};

export const findExistingReview = async (
    userId: string,
    propertyId: string
) => {
    return db.review.findFirst({
        where: {
            propertyId,
            profileId: userId,
        },
    });
};

// ### PropertyRating - Complete

export const fetchPropertyRating = async (propertyId: string) => {
    const result = await db.review.groupBy({
        by: ["propertyId"],
        _avg: {
            rating: true,
        },
        _count: {
            rating: true,
        },
        where: {
            propertyId,
        },
    });

    return {
        rating: result[0]?._avg.rating?.toFixed(1) ?? 0,
        count: result[0]?._count.rating ?? 0,
    };
};
