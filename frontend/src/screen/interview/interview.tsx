import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import logger from '@/lib/logger';
import { useAppStore, useMainStore } from '@/store';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldCloseIcon, Terminal } from 'lucide-react';
import AiChat from '@/components/ai-chat/ai-chat';
import { parseModelResponseToCompatibleForChat } from '@/lib/messageParser';
import { useMutation, useQuery } from '@tanstack/react-query';
import { placeHolderConversation } from '@/constants/interview';
import { Navbar } from '@/components/navbar';
import { AlertType } from '@/constants';
import { formatDurationDayjs } from '@/lib/utils';

interface InterviewProps {
  id: string;
}

export const Interview = (props: InterviewProps) => {
  const { id } = props;
  const [messages, setMessages] = useState<Array<MessageType>>(placeHolderConversation);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isInterviewEnded, setIsInterviewEnded] = useState<boolean>(false);
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const submitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const showAlert = useAppStore().showAlert;

  const setAppLoading = useAppStore().setAppLoader;
  const { sendMessageAi: postMessage, concludeCandidateInterview } = useMainStore();
  const getDataForInterview = useMainStore().getDataForInterview;

  const interview = useQuery({
    queryFn: () => getDataForInterview(id),
    queryKey: ['interview-message', id],
    retry: false,
  });

  const startedAt = useMemo(() => {
    if (messages && messages.length > 0 && messages[0].createdAt) {
      const c = messages[0].createdAt;
      return typeof c === 'string' ? new Date(c) : c;
    }
    return null;
  }, [messages]);

  const concludeInterviewMutation = useMutation({
    mutationFn: (attemptId: string) => {
      return concludeCandidateInterview(attemptId);
    },
    onSuccess: () => {
      showAlert({
        time: 5,
        title: 'Interview submission process started.',
        type: AlertType.success,
        message: 'Submission has been started.'
      });
    },
    onError: (error) => {
      console.log('error occured while submitting the interview', error);
    }
  });

  const handleUserKeyAction = useCallback(() => {
    if (!interview.data) {
      return;
    }
    if (isInterviewEnded) {
      return;
    }
    console.warn('IDLE TIMERS INITIATED');
    let idleSubmitTime = interview.data.idleSubmitTime;
    let idleWarningTime = interview.data.idleWarningTime;

    clearTimeout(idleTimeoutRef.current as NodeJS.Timeout);
    clearTimeout(submitTimeoutRef.current as NodeJS.Timeout);
    console.log('clearing timeouts');
    idleTimeoutRef.current = setTimeout(() => {
      showAlert({
        time: 5,
        title: `No Activity`,
        type: AlertType.warning,
        message: `You are idle for a very long Time, Interview will autosubmit after ${formatDurationDayjs(parseInt(idleSubmitTime))}`
      });
      submitTimeoutRef.current = setTimeout(async () => {
        showAlert({
          time: 4,
          title: 'Concluding interview',
          type: AlertType.warning,
          message: 'You are idle for a very long time now'
        });
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await concludeInterviewMutation.mutateAsync(id);
        setIsInterviewEnded(true);
      }, parseInt(idleSubmitTime) * 1000);
    }, parseInt(idleWarningTime) * 1000);
  }, [interview.data, isInterviewEnded, concludeInterviewMutation, id, showAlert]);

  const handleSubmission = useCallback(
    async (message: string) => {
      try {
        if (isGenerating) {
          return;
        }
        setIsGenerating(true);
        setMessages((prevMessages) => {
          return [
            ...prevMessages,
            {
              content: message,
              id: '-1',
              role: 'user',
              error: false,
              createdAt: new Date()
            }
          ];
        });
        const messages = await postMessage(props.id, message);
        const parsedMessages = messages.slice(1).map((ele, index) => parseModelResponseToCompatibleForChat(ele, index));
        setMessages(parsedMessages);
      } catch (error) {
        logger.error(error);
      } finally {
        setIsGenerating(false);
      }
    },
    [props.id, isGenerating, setIsGenerating, setMessages, postMessage]
  );

  useEffect(() => {
    setAppLoading(interview.isFetching);
  }, [interview.isFetching, setAppLoading]);

  useEffect(() => {
    console.log(interview.data);
    if (!interview.data) return;

    if (messages.length === placeHolderConversation.length) {
      const parsedMessages = interview.data.messages.slice(1).map((ele, idx) => parseModelResponseToCompatibleForChat(ele, idx));
      setMessages(parsedMessages);
    }
    if (!interview.data?.completedAt) {
      handleUserKeyAction();
    }

    return () => {
      clearTimeout(idleTimeoutRef.current as NodeJS.Timeout);
      clearTimeout(submitTimeoutRef.current as NodeJS.Timeout);
    };
  }, [interview.data]);

  if (interview.error) {
    return (
      <>
        <Alert className="fixed top-[50%] left-[50%] w-[300px] -translate-x-1/2 -translate-y-1/2 z-10 flex items-center gap-2">
          <ShieldCloseIcon className="h-6 w-6" color="red" />
          <AlertTitle className="h-6 content-center mt-1">{interview.error.message}</AlertTitle>
        </Alert>
        <main className={`h-full bg-background text-foreground blur-md pointer-events-none`}>
          <AiChat
            messages={messages}
            // interviewId={interviewObj.id}
            interviewEnded={isInterviewEnded}
            handleSubmission={handleSubmission}
            setIsInterviewEnded={setIsInterviewEnded}
            isGenerating={isGenerating}
            handleIntervieweeIdle={handleUserKeyAction}
          />
        </main>
      </>
    );
  }

  return (
    <>
      {interview?.data?.completedAt && (
        <Alert className="fixed top-[50%] w-[300px] left-[50%] translate-x-[-50%] translate-y-[-50%] z-10">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Interview completed!</AlertTitle>
          <AlertDescription>Thanks for interview with us.</AlertDescription>
        </Alert>
      )}
      <div className="h-full">
        <div className="fixed top-0 left-0 w-full h-[60px] z-50">
          <Navbar startedAt={startedAt} completedAt={interview?.data?.completedAt} user={interview.data?.candidate?.user} />
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
              handleIntervieweeIdle={handleUserKeyAction}
            />
          </div>
        </div>
      </div>
    </>
  );
};
