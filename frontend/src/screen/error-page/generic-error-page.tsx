import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router"

interface PageNotFoundConfig {
    pageLink?: string,
    errorMessage?: string,
    statusCode?: number
}

export const ErrorPage = (props: PageNotFoundConfig) => {
    const { errorMessage, statusCode } = props;
    const navigate = useNavigate();
    return (
        <div className="w-full bg-black h-full flex align-middle items-center" >
            <div className="m-auto text-white">
                <h1 className="text-xl m-auto pb-4">
                    {statusCode ?? 404}  |  { errorMessage ?? 'The page could not be found.' }
                </h1>
                <div className="m-auto w-fit">
                    <Button 
                        onClick={() => navigate("/", {
                            replace: true,
                        })}
                        className="text-white"
                        variant="link"
                    >
                        Go Home
                    </Button>
                </div>
            </div>
        </div>
    )
}