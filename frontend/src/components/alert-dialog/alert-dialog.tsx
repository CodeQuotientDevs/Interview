// import { useAppStore } from "@/store"
import {
    AlertDialog, AlertDialogDescription, AlertDialogAction,
    AlertDialogCancel, AlertDialogContent, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { useAppStore } from "@/store";
import { Loader2 } from "lucide-react";

export const GlobalAlertDialog = () => {
    const alerts = useAppStore().alertDialogs
    return (
        <div >
            {Object.values(alerts).map((alert) => (
                <AlertDialog open={true} key={alert.id}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{alert.title}</AlertDialogTitle>
                            <AlertDialogDescription>
                                {alert.description}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel
                                onClick={alert.onCancel}
                                disabled={alert.okButtonLoading || alert.cancelButtonLoading}
                            >
                                {alert.cancelButtonLoading
                                    && (
                                        <Loader2 className="animate-spin" />
                                    )
                                }
                                {alert.cancelButtonTitle}
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={alert.onOk}
                                disabled={alert.okButtonLoading || alert.cancelButtonLoading}
                            >
                                {alert.okButtonLoading
                                    && (
                                        <Loader2 className="animate-spin" />
                                    )
                                }
                                {alert.okButtonTitle}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            ))}
        </div>
    )
}