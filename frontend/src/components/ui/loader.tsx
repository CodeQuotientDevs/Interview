import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
const loadingStaringString = 'Loading.'

type LoaderProps = {
    color?: string
}

export const Loader = (props: LoaderProps) => {
    const loaderRef = useRef<HTMLParagraphElement>(null);
    useEffect(() => {
        const interval = setInterval(() => {
            if (loaderRef.current) {
                const innerText = loaderRef.current.innerText;
                const numberOfDotsCurrentlyPresent = innerText.replace(loadingStaringString, '').length;
                const numberOfDotsRequired = (numberOfDotsCurrentlyPresent + 1) % 3;
                let newValue = loadingStaringString;
                for (let index = 0; index < numberOfDotsRequired; ++index) {
                    newValue += ".";
                }
                loaderRef.current.innerText = newValue;
            }
        }, 1000);
        return () => {
            if (interval) {
                clearTimeout(interval);
            }
        }
    }, []);

    return (
        <div className="flex h-full w-full items-center align-middle" >
            <div className="m-auto">
                <Loader2 className={cn('size-7 m-auto animate-spin', props.color?`text-${props.color}`:'')} />
                <p className={cn('text-lg w-16', props.color?`text-${props.color}`:'')} ref={loaderRef}>{loadingStaringString}</p>
            </div>
        </div>
    )
}