import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { loginClient, useAppStore } from "@/store"
// import { AlertType } from "@/constants"
import { useState } from "react"
import { Trash2Icon, CopyIcon, KeyIcon } from "lucide-react"
import { toast } from "sonner"
import { AlertType } from "@/constants"

interface Token {
    token: string
    userId: string
    isActive: boolean
    createdAt: string
}

export function TokenDialog({ children }: { children: React.ReactNode }) {
    const [tokens, setTokens] = useState<Token[]>([])
    const { showAlert,useAlertModel:showAlertModel } = useAppStore()

    const fetchTokens = async () => {
        try {
            const data = await loginClient.getTokens()
            setTokens(data as Token[])
        } catch (error) {
            console.error(error)
            toast.error("Failed to fetch tokens")
        }
    }

    const generateToken = async () => {
        try {
            await loginClient.generateToken()
            toast.success("Token generated successfully")
            fetchTokens()
        } catch (error) {
            console.error(error)
            toast.error("Failed to generate token")
        }
    }

    const deleteToken = async (token: string) => {
        showAlertModel({
            title: "Delete Token?",
            description: "Are you sure you want to delete this token? This action is not reversible.",
            okButtonTitle: "Delete",
            cancelButtonTitle: "Cancel",
            onOk: async () => {
                try {
                    await loginClient.deleteToken(token)
                    toast.success("Token deleted successfully")
                    fetchTokens()
                } catch (error) {
                    console.error(error)
                    toast.error("Failed to delete token")
                }
            },
            onCancel: async () => { },
        })
    }

    const copyToken = (token: string) => {
        navigator.clipboard.writeText(token)
        toast.success("Token copied to clipboard")
    }

    return (
        <Dialog onOpenChange={(open) => {
            if (open) fetchTokens()
        }}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="max-w-[400px] sm:max-w-[540px]">
                <DialogHeader>
                    <DialogTitle>API Tokens</DialogTitle>
                    <DialogDescription>
                        Manage your API tokens here. These tokens can be used to authenticate with external services.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-6 space-y-4">
                    <Button onClick={generateToken} className="w-full">
                        <KeyIcon className="mr-2 h-4 w-4" />
                        Generate New Token
                    </Button>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                        {tokens.map((token) => (
                            <div key={token.token} className="flex items-center justify-between p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
                                <div className="grid gap-1 truncate w-[70%]">
                                    <p className="text-sm font-medium leading-none truncate" title={token.token}>
                                        {token.token}
                                    </p>
                                    <p className="text-muted-foreground text-xs">
                                        Created: {new Date(token.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => {
                                        copyToken(token.token)
                                        showAlert(
                                            {
                                                time: 5,
                                                title: 'Token Copied',
                                                type: AlertType.success,
                                                message: 'Token copied to clipboard'
                                            }
                                        )

                                    }}>
                                        <CopyIcon className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => deleteToken(token.token)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                                        <Trash2Icon className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                        {tokens.length === 0 && (
                            <div className="text-center text-muted-foreground py-8">
                                No tokens found. Generate one to get started.
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
