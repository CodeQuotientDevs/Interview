type MessageType = 
    | {
        id: string;
        content: string;
        createdAt?: Date;
        role: string;
        error: boolean;
        parsedData?: undefined;
        type?: string;
        audioUrl?: string;
        audioDuration?: number;
    }
    | {
        id: string;
        content: string;
        createdAt?: Date;
        role: string;
        error?: undefined;
        type?: string;
        audioUrl?: string;
        audioDuration?: number;
    };

type InviteStatus = 'processing' | 'pending' | 'failed' | 'sent';