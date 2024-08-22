import CategoriesList from "@/components/home/CategoriesList";
import PropertiesContainer from "@/components/home/PropertiesContainer";
import { Suspense } from "react";

function HomePage({
    searchParams,
}: {
    searchParams: { category?: string; search?: string };
}) {
    // console.log(searchParams);

    return (
        <section>
            <CategoriesList
                category={searchParams?.category}
                search={searchParams?.search}
            />
            <Suspense>
                <PropertiesContainer
                    category={searchParams?.category}
                    search={searchParams?.search}
                />
            </Suspense>
        </section>
    );
}
export default HomePage;
