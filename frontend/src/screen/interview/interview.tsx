import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import logger from '@/lib/logger';
import { useAppStore, useMainStore } from '@/store';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { ShieldCloseIcon, Terminal } from 'lucide-react';
import AiChat from '@/components/ai-chat/ai-chat';
import { parseModelResponseToCompatibleForChat } from '@/lib/messageParser';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Navbar } from '@/components/navbar';
import { AlertType } from '@/constants';
import { formatDurationDayjs } from '@/lib/utils';
import { EmailVerificationModal } from '@/components/email-verification-modal';
import { MessageTypeEnum } from '@/constants/message';
import { BlockingOverlay } from '@/components/ui/blocking-overlay';

interface InterviewProps {
  id: string;
}

export const Interview = (props: InterviewProps) => {
  const { id } = props;
  const [messages, setMessages] = useState<Array<MessageType>>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isInterviewEnded, setIsInterviewEnded] = useState<boolean>(false);
  const [showEmailVerification, setShowEmailVerification] = useState<boolean>(false);
  const [isEmailVerified, setIsEmailVerified] = useState<boolean>(false);
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const submitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const showAlert = useAppStore().showAlert;

  const setAppLoading = useAppStore().setAppLoader;
  const { sendMessageAi: postMessage, concludeCandidateInterview,getPresignedUrl,getDataForInterview } = useMainStore();

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
 
    const idleSubmitTime = interview.data.idleSubmitTime;
    const idleWarningTime = interview.data.idleWarningTime;

    clearTimeout(idleTimeoutRef.current as NodeJS.Timeout);
    clearTimeout(submitTimeoutRef.current as NodeJS.Timeout);
 
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


  const handleAudioSubmission = useCallback(async (audioFile: File, audioDuration: number) => {
    if(isGenerating || isUploading){
      return;
    }
    try {
      setIsUploading(true);
      setIsGenerating(true);
      const presignedUrl = await getPresignedUrl(audioFile.type);
      
      const response = await fetch(presignedUrl.uploadUrl, {
        method: 'PUT',
        body: audioFile,
        headers: {
          'Content-Type': audioFile.type,
        }
      });

      setIsUploading(false);

      if (!response.ok) {
        throw new Error('Failed to upload audio');
      }

      const optimisticMessageId = Date.now().toString();
      // Optimistically add the user's audio message
      const audioUrl = URL.createObjectURL(audioFile);
      setMessages((prev) => [
        ...prev,
        {
          id: optimisticMessageId,
          role: 'user',
          content: "",
          audioUrl: audioUrl,
          audioDuration: audioDuration,
          type: 'audio',
          error: false,
          createdAt: new Date(),
        }
      ]);

      setIsGenerating(true);
      const newMessages = await postMessage(id,"", presignedUrl.fileUrl, MessageTypeEnum.AUDIO, audioDuration);
      
      // Update messages using functional update to avoid stale closures
      setMessages((prev) => {
        const optimisticIndex = prev.findIndex(m => m.id === optimisticMessageId);
        
        if (optimisticIndex !== -1) {
          const lastServerMessage = parseModelResponseToCompatibleForChat(newMessages[newMessages.length - 1], newMessages.length - 1);
          return [...prev, lastServerMessage];
        }
        
        return newMessages.slice(1).map((ele, index) => parseModelResponseToCompatibleForChat(ele, index));
      });
    } catch (error) {
        logger.error(error);
        setIsUploading(false);
        setIsGenerating(false); 
    } finally {
        setIsUploading(false);
        setIsGenerating(false);
    }
  }, [isGenerating, isUploading, getPresignedUrl, postMessage, id])

  const handleSubmission = useCallback(
    async (message: string) => {
      if (isGenerating || message.trim()==="" || isUploading) {
        return;
      }
      try {
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
    [props.id, isGenerating, setIsGenerating, setMessages, postMessage ,isUploading]
  );

  useEffect(() => {
    setAppLoading(interview.isFetching);
  }, [interview.isFetching, setAppLoading]);

  useEffect(() => {
    if (!interview.data) return;

    // Check if interview is started but not completed, and show email verification
    if (interview.data.messages && interview.data.messages.length > 0 && !interview.data.completedAt && !isEmailVerified) {
      setShowEmailVerification(true);
      return;
    }

    // Load messages when email is verified or if no verification needed
    if (isEmailVerified || !showEmailVerification) {
      if (messages.length === 0) {
        const parsedMessages = interview.data.messages.slice(1).map((ele, idx) => parseModelResponseToCompatibleForChat(ele, idx));
        setMessages(parsedMessages);
      }
    }

    if (interview.data?.completedAt) {
      setIsInterviewEnded(true);
    } else {
      handleUserKeyAction();
    }

    return () => {
      clearTimeout(idleTimeoutRef.current as NodeJS.Timeout);
      clearTimeout(submitTimeoutRef.current as NodeJS.Timeout);
    };
  }, [interview.data, isEmailVerified, showEmailVerification]);

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
              isUploading={isUploading}
              handleIntervieweeIdle={handleUserKeyAction}
              handleAudioSubmission={handleAudioSubmission}
            />
        </main>
      </>
    );
  }

  const isProcessing = interview.data?.inviteStatus && interview.data?.inviteStatus !== 'sent';
  const isNotStarted = interview.data?.inviteStatus === 'sent' && interview.data?.candidate?.startTime && new Date(interview.data.candidate.startTime) > new Date();
  const isCompleted = interview.data?.completedAt;
  const isBlocked = isCompleted || (showEmailVerification && !isEmailVerified) || isProcessing || isNotStarted;
  
  return (
    <>
      <EmailVerificationModal
        isOpen={showEmailVerification}
        candidateEmail={interview.data?.candidate?.user?.email || ''}
        onVerified={() => {
          console.log("zolo")
          setShowEmailVerification(false);
          setIsEmailVerified(true);
        }}
      />
      
      {isProcessing && (
        <BlockingOverlay 
            imageSrc="/interview-not-started.svg" 
            title="Interview is being still processed" 
        />
      )}
      
      {isNotStarted && (
         <BlockingOverlay 
            imageSrc="/interview-not-started.svg" 
            title="Interview is not started yet, come after sometime" 
        />
      )}

      {isCompleted && (
         <BlockingOverlay 
            imageSrc="/Interview-completed.png" 
         >
           <div className="text-center">
             <Terminal className="h-12 w-12 mx-auto mb-4" />
             <h2 className="text-2xl font-bold mb-2">Interview completed!</h2>
             <p className="text-muted-foreground">Thanks for interviewing with us.</p>
           </div>
         </BlockingOverlay>
      )}

      <div className="h-full">
        <div className="fixed top-0 left-0 w-full h-[60px] z-50">
          <Navbar startedAt={startedAt} completedAt={interview?.data?.completedAt} user={interview.data?.candidate?.user} />
        </div>
        <div className="pt-[60px] h-full">
          <div className={`h-full bg-background text-foreground ${isBlocked ? 'blur-md pointer-events-none' : ''}`}>
             <AiChat
              messages={messages}
              // interviewId={interviewObj.id}
              interviewEnded={isInterviewEnded}
              handleSubmission={handleSubmission}
              setIsInterviewEnded={setIsInterviewEnded}
              isGenerating={isGenerating}
              isUploading={isUploading}
              handleIntervieweeIdle={handleUserKeyAction}
              handleAudioSubmission={handleAudioSubmission}
            />
          </div>
        </div>
      </div>
    </>
  );
};
