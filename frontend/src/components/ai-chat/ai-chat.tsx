import { Chat } from "@/components/ui/chat";
import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { Editor, EditorRefType } from "@/components/editor";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

interface AiChatProp {
    // interviewId: string;
    isGenerating: boolean;
    interviewEnded: boolean;
    messages: Array<MessageType>;
    handleSubmission: (response: string) => Promise<void>;
    setIsInterviewEnded: (data: boolean) => void;
}

export default function AiChat(props: AiChatProp) {
    const { messages, isGenerating, interviewEnded, handleSubmission, setIsInterviewEnded } = props;
    const [input, setInput] = useState<string>("");
    const [openCodeEditor, setOpenCodeEditor] = useState<boolean>(false);
    const [languageSelections, setLanguageSelection] = useState<Array<{ label: string, value: string }>>([]);
    const [selectedLanguage, setSelectedLanguage] = useState<string>("");
    const [editorValue, setEditorValue] = useState<string>('');
    const editorRef = useRef<EditorRefType>(null);

    const handleInputChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
    }, []);

    const handleEditorSubmit = useCallback(async (skip?: boolean) => {
        const value = editorRef.current?.getValue();
        let inputToSend = '';
        if (skip) {
            inputToSend = 'Lets skip this question.';
            setOpenCodeEditor(false);
        }
        if (value && selectedLanguage) {
            inputToSend = `\`\`\`${selectedLanguage}\n${value}\n${input}\`\`\``;
        }
        setInput('');
        await handleSubmission(inputToSend);
        setEditorValue('');
    }, [ selectedLanguage, handleSubmission, setEditorValue, input]);

    const handleSubmissionSimpleInput = useCallback(async (event?: { preventDefault?: (() => void) | undefined; }) => {
        event?.preventDefault?.();
        setInput('');
        let inputToSend = input;
        const editorContent = editorRef.current?.getValue();
        if (editorContent) {
            inputToSend = `\`\`\`${selectedLanguage}\n${editorContent}\n${input}\n\`\`\``
            setEditorValue('');
        }
        await handleSubmission(inputToSend);
    }, [input, handleSubmission]);

    useEffect(() => {
        for (let index = messages.length - 1; index >= 0; index--) {
            const currentMessage = messages[index];
            if (currentMessage?.role === "model") {
                setLanguageSelection(currentMessage.parsedData?.languagesAllowed ?? []);
                setOpenCodeEditor(currentMessage.parsedData?.editorType === 'editor');
                if (currentMessage.parsedData && 'isInterviewGoingOn' in currentMessage.parsedData) {
                    setIsInterviewEnded(!currentMessage.parsedData.isInterviewGoingOn)
                }
                break;
            }
        }
    }, [messages, setIsInterviewEnded]);

    useEffect(() => {
        if (!languageSelections.length) {
            setSelectedLanguage("");
            return;
        }
        setSelectedLanguage(languageSelections[0].value);

    }, [languageSelections]);

    return (
        <div className="flex gap-4 p-4 h-full">
            <Chat
                className="transition-all flex-1 mt-auto"
                showInput={!interviewEnded}
                messages={messages}
                input={input}
                handleInputChange={handleInputChange}
                isGenerating={isGenerating}
                handleSubmit={handleSubmissionSimpleInput}
            />
            <AnimatePresence>
                {openCodeEditor && !interviewEnded && (
                    <motion.div
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "66%" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="h-full flex flex-col border border-border rounded-lg shadow-md bg-gray-900"
                    >
                        <div className="p-3 flex gap-2 bg-gray-800">
                            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                                <SelectTrigger className="w-[180px] bg-white">
                                    <SelectValue placeholder="Select a language" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        {languageSelections.map((ele) => (
                                            <SelectItem key={ele.value} value={ele.value}>
                                                {ele.label}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            <Button
                                className="ml-auto"
                                variant="outline"
                                disabled={isGenerating}
                                onClick={() => {
                                    handleEditorSubmit(true);
                                }}
                            >
                                {isGenerating
                                    && <Loader2 className="animate-spin" />
                                }
                                Skip
                            </Button>
                            <Button
                                variant="outline"
                                disabled={isGenerating}
                                onClick={() => {
                                    handleEditorSubmit(false);
                                }}
                            >
                                {isGenerating
                                    && <Loader2 className="animate-spin" />
                                }
                                Submit
                            </Button>
                        </div>
                        <Editor
                            ref={editorRef}
                            value={editorValue}
                            language={selectedLanguage}
                            onChange={setEditorValue}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
