export const placeHolderConversation = [
    {
        id: "0",
        error: false,
        content: "Welcome! I'm your AI interviewer. Let's begin. Please tell me about yourself and your experience.",
        role: "model",
    },
    {
        id: "1",
        error: false,
        content: "I'm a recent graduate with a degree in Computer Science. I've worked on personal projects and have some experience with [mention specific technologies].",
        role: "user",
    },
    {
        id: "2",
        error: false,
        content: "Great. Can you elaborate on one of your personal projects and the challenges you faced?",
        role: "model",
    },
];


export const languagesAllowed = [
    { value: "javascript", label: "JavaScript" },
    { value: "python", label: "Python" },
    { value: "java", label: "Java" },
    { value: "cpp", label: "C++" },
    { value: "typescript", label: "TypeScript" },
];
export const inviteStatusConfig: Record<InviteStatus, { label: string; variant: "secondary" | "outline" | "destructive" | "default" }> = {
  processing: {
    label: "Processing",
    variant: "secondary",
  },
  pending: {
    label: "Pending",
    variant: "outline",
  },
  failed: {
    label: "Failed",
    variant: "destructive",
  },
  sent: {
    label: "Sent",
    variant: "default",
  },
}
