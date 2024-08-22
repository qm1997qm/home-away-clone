"use client";

import { usePathname } from "next/navigation";
import FormContainer from "../form/FormContainer";
import { addFavoriteAction, removeFavoriteAction } from "@/utils/actions";
import { CardSubmitButton } from "../form/Buttons";

type FavoriteToggleFormProps = {
    propertyId: string;
    favoriteId: string | null;
};

function FavoriteToggleForm({
    propertyId,
    favoriteId,
}: FavoriteToggleFormProps) {
    const pathname = usePathname();
    const addAction = addFavoriteAction.bind(null, {
        propertyId,
        favoriteId,
        pathname,
    });

    const removeAction = removeFavoriteAction.bind(null, {
        propertyId,
        favoriteId,
        pathname,
    });
    return (
        <FormContainer action={favoriteId ? removeAction : addAction}>
            <CardSubmitButton isFavorite={favoriteId ? true : false} />
        </FormContainer>
    );
}
export default FavoriteToggleForm;
