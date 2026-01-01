import { Chat } from '@/components/ui/chat';
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Editor, EditorRefType } from '@/components/editor';
import { Button } from '@/components/ui/button';
import { Loader2, GripVertical, Wand2 } from 'lucide-react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { languagesAllowed } from '@/constants/interview';

interface AiChatProp {
    // interviewId: string;
    isGenerating: boolean;
    isUploading: boolean;
    interviewEnded: boolean;
    messages: Array<MessageType>;
    handleSubmission: (response: string) => Promise<void>;
    setIsInterviewEnded: (data: boolean) => void;
    handleIntervieweeIdle: () => void;
    handleAudioSubmission: (audioFile: File, audioDuration: number) => Promise<void>;
}

export default function AiChat(props: AiChatProp) {
    const { messages, isGenerating, isUploading, interviewEnded, handleSubmission, setIsInterviewEnded, handleIntervieweeIdle, handleAudioSubmission: propsHandleAudioSubmission } = props;
    const [input, setInput] = useState<string>('');
    const [selectedLanguage, setSelectedLanguage] = useState<string>(languagesAllowed[0].value);
    const [editorValue, setEditorValue] = useState<string>('');
    const [editorWidth, setEditorWidth] = useState<number>(600);
    const [isResizing, setIsResizing] = useState<boolean>(false);
    const editorRef = useRef<EditorRefType>(null);
    const resizeRef = useRef<{ startX: number; startWidth: number }>({ startX: 0, startWidth: 0 });

    const handleInputChange = useCallback(
        (e: ChangeEvent<HTMLTextAreaElement>) => {
            setInput(e.target.value);
            handleIntervieweeIdle();
        },
        [handleIntervieweeIdle]
    );

    const handleEditorInputChange = useCallback(
        (value: string) => {
            setEditorValue(value);
            handleIntervieweeIdle();
        },
        [handleIntervieweeIdle]
    );

    const handleUnifiedSubmission = useCallback(
        async (options?: { skip?: boolean; preventDefault?: boolean }) => {
            handleIntervieweeIdle();

            // Handle skip
            if (options?.skip) {
                setInput('');
                setEditorValue('');
                await handleSubmission('Lets skip this question.');
                return;
            }

            // Build input to send
            let inputToSend = input;
            const editorContent = editorRef.current?.getValue();

            // If there's editor content, format it as code block
            if (editorContent && selectedLanguage) {
                const marker = `\n\n[Code Attachment (${selectedLanguage})]:`;
                const codeFence = '```';
                inputToSend = `${input ? input : ""}${marker}\n${codeFence}${selectedLanguage}\n${editorContent}\n${codeFence}`;
                setEditorValue('');
            }

            setInput('');
            await handleSubmission(inputToSend);
        },
        [handleIntervieweeIdle, input, selectedLanguage, handleSubmission]
    );

    const handleChatSubmit = useCallback(
        async (event?: { preventDefault?: (() => void) | undefined }) => {
            event?.preventDefault?.();
            await handleUnifiedSubmission();
        },
        [handleUnifiedSubmission]
    );

    const handleFormatCode = useCallback(() => {
        if (editorRef.current) {
            editorRef.current.trigger('keyboard', 'editor.action.formatDocument', {});
        }
    }, []);

    useEffect(() => {
        for (let index = messages.length - 1; index >= 0; index--) {
            const currentMessage = messages[index];
            if (currentMessage?.role === 'model') {
                if (currentMessage.parsedData && 'isInterviewGoingOn' in currentMessage.parsedData) {
                    setIsInterviewEnded(!currentMessage.parsedData.isInterviewGoingOn);
                }
                break;
            }
        }
    }, [messages, setIsInterviewEnded]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        setIsResizing(true);
        resizeRef.current = {
            startX: e.clientX,
            startWidth: editorWidth,
        };
    }, [editorWidth]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isResizing) return;

        const deltaX = resizeRef.current.startX - e.clientX;
        const newWidth = Math.max(400, Math.min(1200, resizeRef.current.startWidth + deltaX));
        setEditorWidth(newWidth);
    }, [isResizing]);

    const handleMouseUp = useCallback(() => {
        setIsResizing(false);
    }, []);

    useEffect(() => {
        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isResizing, handleMouseMove, handleMouseUp]);

    return (
        <div className="flex gap-4 p-4 h-full">
            <Chat
                className="transition-all flex-1 mt-auto"
                showInput={!interviewEnded}
                messages={messages}
                input={input}
                handleInputChange={handleInputChange}
                isGenerating={isGenerating}
                isUploading={isUploading}
                handleSubmit={handleChatSubmit}
                allowEmptySubmit={!!editorValue?.trim()}
                handleAudioSubmission={async (file, transcribedText, duration) => {
                    // let textToSend = transcribedText;
                    // const editorContent = editorRef.current?.getValue();
                    // if (editorContent && selectedLanguage) {
                    //     const marker = `\n\n[Code Attachment (${selectedLanguage})]:`;
                    //     const codeFence = '```';
                    //     textToSend = `${transcribedText}${marker}\n${codeFence}${selectedLanguage}\n${editorContent}\n${codeFence}`;
                    //     setEditorValue('');
                    // }
                    await propsHandleAudioSubmission(file, duration);
                }}
            />

            {!interviewEnded && (
                <div className='flex flex-col h-full relative' style={{ width: `${editorWidth}px` }}>
                    {/* Resize handle */}
                    <div
                        className="absolute left-0 top-0 bottom-0 w-3 cursor-col-resize z-10 group flex items-center justify-center bg-gray-700 hover:bg-gray-600 transition-colors"
                        onMouseDown={handleMouseDown}
                    >
                        <GripVertical className="w-3 h-3 text-gray-400 group-hover:text-blue-400 transition-colors" />
                    </div>

                    <div className="p-4 pl-6 pb-[12px] gap-2 bg-gray-800 flex justify-between">
                        <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                            <SelectTrigger className="w-[150px] bg-white">
                                <SelectValue placeholder="Select a language" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    {languagesAllowed.map((ele) => (
                                        <SelectItem key={ele.value} value={ele.value}>
                                            {ele.label}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        <div className="flex gap-2 items-center">
                            <Button
                                variant="outline"
                                onClick={handleFormatCode}
                                title="Format Code"
                            >
                                <Wand2 className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="outline"
                                disabled={isGenerating}
                                onClick={() => {
                                    handleUnifiedSubmission({ skip: true });
                                }}
                            >
                                {isGenerating && <Loader2 className="animate-spin" />}
                                Skip
                            </Button>
                        </div>
                    </div>
                    <Editor ref={editorRef} value={editorValue} language={selectedLanguage} onChange={handleEditorInputChange} />
                </div>
            )}
        </div>
    );
}
