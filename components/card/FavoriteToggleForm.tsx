"use client";

import { usePathname } from "next/navigation";
import FormContainer from "../form/FormContainer";
import { CardSubmitButton } from "../form/Buttons";
import { toggleFavoriteAction } from "@/utils/actions";

type FavoriteToggleFormProps = {
    propertyId: string;
    favoriteId: string | null;
};

function FavoriteToggleForm({
    propertyId,
    favoriteId,
}: FavoriteToggleFormProps) {
    const pathname = usePathname();
    const toggleAction = toggleFavoriteAction.bind(null, {
        pathname,
        favoriteId,
        propertyId,
    });
    return (
        <FormContainer action={toggleAction}>
            <CardSubmitButton isFavorite={favoriteId ? true : false} />
        </FormContainer>
    );
}
export default FavoriteToggleForm;
