import { useCallback, useEffect, useMemo, useState } from 'react';
import logger from '@/lib/logger';
import { useAppStore, useMainStore } from '@/store';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldCloseIcon, Terminal } from 'lucide-react';
import AiChat from '@/components/ai-chat/ai-chat';
import { parseModelResponseToCompatibleForChat } from '@/lib/messageParser';
import { useQuery } from '@tanstack/react-query';
import { placeHolderConversation } from '@/constants/interview';
import { Navbar } from '@/components/navbar';

interface InterviewProps {
    id: string,
}

export const Interview = (props: InterviewProps) => {
    const { id } = props;
    const [messages, setMessages] = useState<Array<MessageType>>(placeHolderConversation);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [isInterviewEnded, setIsInterviewEnded] = useState<boolean>(false);

    const setAppLoading = useAppStore().setAppLoader;
    const postMessage = useMainStore().sendMessageAi;
    const getDataForInterview = useMainStore().getDataForInterview;

    const interview = useQuery({
        queryFn: () => {
            return getDataForInterview(id);
        },
        queryKey: ['interview-message', id],
    });

    const firstMessage = useMemo(() => {
        return messages && messages.length > 0 ? messages[0].content : null;
    }, [messages]);

    const startedAt = useMemo(() => {
        if (messages && messages.length > 0 && messages[0].createdAt) {
            const c = messages[0].createdAt;
            return typeof c === 'string' ? new Date(c) : c;
        }
        return null;
    }, [messages]);

    const handleSubmission = useCallback(async (message: string) => {
        try {
            if (isGenerating) {
                return;
            }
            setIsGenerating(true);
            setMessages((prevMessages) => {
                return [...prevMessages, {
                    content: message,
                    id: '-1',
                    role: 'user',
                    error: false,
                    createdAt: new Date(),
                }]
            });
            const messages = await postMessage(props.id, message);
            const parsedMessages = messages.map((ele, index) => parseModelResponseToCompatibleForChat(ele, index));
            setMessages(parsedMessages);
        } catch (error) {
            logger.error(error);
        } finally {
            setIsGenerating(false);
        }
    }, [props.id, isGenerating, setIsGenerating, setMessages, postMessage]);

    useEffect(() => {
        setAppLoading(interview.isLoading);
    }, [interview.isLoading, setAppLoading]);

    useEffect(() => {
        if (interview.data?.messages) {
            const messages = interview.data.messages;
            const parsedMessages = messages.slice(1).map((ele, index) => parseModelResponseToCompatibleForChat(ele, index));
            setMessages(parsedMessages);
        }
    }, [interview.data]);

    if (interview.error) {
        return (
            <>
                <Alert className="fixed top-[50%] left-[50%] w-[300px] -translate-x-1/2 -translate-y-1/2 z-10 flex items-center gap-2">
                    <ShieldCloseIcon className="h-6 w-6" color="red" />
                    <AlertTitle className="h-6 content-center mt-1">
                        {interview.error.message}
                    </AlertTitle>
                </Alert>
                <main className={`h-full bg-background text-foreground blur-md pointer-events-none`}>
                    <AiChat
                        messages={messages}
                        // interviewId={interviewObj.id}
                        interviewEnded={isInterviewEnded}
                        handleSubmission={handleSubmission}
                        setIsInterviewEnded={setIsInterviewEnded}
                        isGenerating={isGenerating}
                    />
                </main>
            </>
        )
    }

    return (
        <>
            {interview?.data?.completedAt
                && (
                    < Alert className="fixed top-[50%] w-[300px] left-[50%] translate-x-[-50%] translate-y-[-50%] z-10" >
                        <Terminal className="h-4 w-4" />
                        <AlertTitle>Interview completed!</AlertTitle>
                        <AlertDescription>
                            Thanks for interview with us.
                        </AlertDescription>
                    </Alert>
                )
            }
            <div className="h-full">
                <div className="fixed top-0 left-0 w-full h-[60px] z-50">
                <Navbar firstMessage={firstMessage} startedAt={startedAt} user={interview.data?.candidate?.user}/>
                </div>
                <div className="pt-[60px] h-full">                       
                    <div className={`h-full bg-background text-foreground ${interview?.data?.completedAt ? 'blur-md' : ''}`}>
                        <AiChat
                            messages={messages}
                            // interviewId={interviewObj.id}
                            interviewEnded={isInterviewEnded}
                            handleSubmission={handleSubmission}
                            setIsInterviewEnded={setIsInterviewEnded}
                            isGenerating={isGenerating}
                        />
                    </div>
                </div>
            </div>
        </>
    )
}