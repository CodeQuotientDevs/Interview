interface ArrowProps {
    fillUp?: boolean;
    fillDown?: boolean;
    className?: string;
}

export default function Arrow({ fillUp = false, fillDown = false, className = "" }: ArrowProps) {
    return (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className={`lucide lucide-arrow-up-down ${className}`}
        >
            {/* Down arrow (right side) */}
            <path d="m21 16-4 4-4-4" fill={fillDown ? "currentColor" : "none"} stroke={
                fillDown ? "black" : "currentColor"
            } />
            <path d="M17 20V4" fill="none" stroke={
                fillDown ? "black" : "currentColor"
            }/>
            {/* Up arrow (left side) */}
            <path d="m3 8 4-4 4 4" fill={fillUp ? "currentColor" : "none"} stroke={
                fillUp ? "black" : "currentColor"
            } />
            <path d="M7 4v16" fill="none" stroke={
                fillUp ? "black" : "currentColor"
            }/>
        </svg>
    )
}