type MessageType = 
    | {
        id: string;
        content: string;
        createdAt?: Date;
        role: string;
        error: boolean;
        parsedData?: undefined;
    }
    | {
        id: string;
        content: string;
        parsedData: {
            editorType: 'editor' | 'inputBox';
            isInterviewGoingOn: boolean;
            message: string;
            topic?: string;
            languagesAllowed: Array<{ label: string, value: string }>,
        };
        createdAt?: Date;
        role: string;
        error?: undefined;
    };