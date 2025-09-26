import { Loader } from "@/components/ui/loader";
import { ReactElement } from "react";

interface AppLoaderComponent {
    children: ReactElement;
    loading: boolean;
}

export const AppLoader = (props: AppLoaderComponent) => {
    const appLoading = props.loading;
    return (
        <>
            <div className={`w-full h-full ${appLoading ? 'pointer-events-none blur-md bg-transparent ' : ''}`}>
                {props.children}
            </div>
            {appLoading
                && (
                    <div className="absolute top-0 left-0 fixed w-[100vw] h-[100vh] z-50">
                        <Loader />
                    </div>
                )
            }
        </>
    );
};
