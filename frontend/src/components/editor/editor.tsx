import React, { useCallback, useState } from "react";
import MonacoEditor, { OnMount } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { Loader } from "../ui/loader";

type EditorProps = {
    language: string;
    theme?: string;
    value: string;
    onChange: (value: string) => void;
};

export type EditorRefType = monaco.editor.IStandaloneCodeEditor | null;

export const Editor = React.forwardRef<EditorRefType, EditorProps>((props, ref) => {
    const { language, theme, value, onChange } = props;

    const [loadingEditor, setLoadingEditor] = useState(true);

    const handleEditorMount: OnMount = (editor) => {
        if (ref && 'current' in ref) {
            ref.current = editor;
        }
        setLoadingEditor(false);
    };

    const handleEditorChange = useCallback((value: string | undefined) => {
        onChange(value ?? "");
    }, [onChange]);

    return (
        <>
            {loadingEditor && (
                <div className="w-full h-full">
                    <Loader
                        color="white"
                    />
                </div>

            )}
            <MonacoEditor
                className={`${loadingEditor?'hidden':'visible'}`}
                language={language}
                theme={theme ?? "vs-dark"}
                value={value}
                onMount={handleEditorMount}
                onChange={handleEditorChange}
                options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                }}
            />
        </>
    );
});

Editor.displayName = "Editor";

