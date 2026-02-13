import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import LoginApi from "@/client/login-client";
import { sessionSchema } from "@/zod/interview";
import logger from "@/lib/logger";
import { AlertType } from "@/constants";
import { loginClientURL } from "../config";

interface SingleAlert {
    title: string,
    message?: string,
    type: AlertType,
    time: number,
}

interface AlertDialog {
    id: string,
    title: string,
    description: string,
    cancelButtonTitle: string,
    okButtonTitle: string,
    okButtonLoading?: boolean,
    cancelButtonLoading?: boolean,
    onCancel: () => Promise<void>,
    onOk: () => Promise<void>,
}

interface AppStoreState {
    appLoader: boolean,
    session: typeof sessionSchema._type | null
    initalLoadCompleted: boolean,
    alerts: Array<FinalAlert>,
    alertDialogs: Record<string, AlertDialog>
    useAlertModel: ( alert: Omit<AlertDialog, "id"> ) => void,
    showAlert: (alert: SingleAlert) => void,
    loginWithGoogle: (token: string) => Promise<boolean>
    login: (payload: { email: string, password: string }) => Promise<boolean>
    getSession: () => Promise<boolean>
    setAlert: (data: Array<FinalAlert>) => void
    setAppLoader: (value: boolean) => void
    logout: () => void
}

export const createAppStore = (client: LoginApi) => {
    const initialValues: AppStoreState = {
        alertDialogs: {},
        appLoader: false,
        session: null,
        initalLoadCompleted: false,
        alerts: [],
        showAlert: () => { },
        login: async () => {
            return false;
        },
        loginWithGoogle: async () => {
            return false
        },
        getSession: async () => {
            return false;
        },
        logout: async () => {
            window.location.href = `${loginClientURL}/logout`
        },
        useAlertModel: () => { },
        setAlert: () => { },
        setAppLoader: () => { },
    }

    return create<AppStoreState>()(
        immer((set, get) => ({
            ...initialValues,
            useAlertModel: (alert) => {
                set((state) => {
                    const id = crypto.randomUUID();
                    const onOk = alert.onOk;
                    const onCancel = alert.onCancel;
                    alert.onCancel = async () => {
                        set((state) => {
                            if(state.alertDialogs[id]) {
                                state.alertDialogs[id] = {
                                    ...state.alertDialogs[id],
                                    cancelButtonLoading: true,
                                }
                            }
                        })
                        alert.cancelButtonLoading = true;
                        await onCancel();
                        set((state) => {
                            delete state.alertDialogs[id]
                            return state;
                        });
                    }
                    alert.onOk = async () => {
                        try {
                            set((state) => {
                                if(state.alertDialogs[id]) {
                                    state.alertDialogs[id] = {
                                        ...state.alertDialogs[id],
                                        okButtonLoading: true,
                                    }
                                }
                            })
                            await onOk();
                            set((state) => {
                                delete state.alertDialogs[id]
                                return state;
                            });
                        } catch (error) {
                            set((state) => {
                                delete state.alertDialogs[id]
                                return state;
                            });
                            throw error;
                        }
                    }
                    state.alertDialogs[id] = {...alert, id};
                });
            },
            loginWithGoogle: async (payload) => {
                const res = await client.loginWithGoogle(payload);
                if (res) {
                    await get().getSession();
                }
                return res;
            },
            login: async (payload) => {
                const res = await client.login(payload);
                if (res) {
                    await get().getSession();
                }
                return res;
            },
            getSession: async () => {
                try {
                    const response = await client.getSession();
                    const zodResult = sessionSchema.safeParse(response?.data);
                    if (!zodResult.success) {
                        throw zodResult.error
                    }
                    set({
                        session: zodResult.data,
                        initalLoadCompleted: true,
                    });
                    return true;
                } catch (error) {
                    logger.error(error);
                    set({
                        initalLoadCompleted: true,
                    });
                }
                return false;
            },
            setAppLoader: (value) => {
                set({
                    appLoader: value,
                });
            },
            setAlert: (data: Array<FinalAlert>) => {
                set({
                    alerts: data,
                });
            },
            logout: async () => {
                await client.logout();
                set({
                    session: null,
                });
                window.location.href = `/`;
            },
            showAlert: (singleAlert) => {
                const finalAlert: FinalAlert = {
                    id: crypto.randomUUID(),
                    show: false,
                    message: singleAlert.message,
                    showUpto: Date.now() + (singleAlert.time * 1000),
                    title: singleAlert.title,
                    type: singleAlert.type,
                }
                set((state) => {
                    state.alerts.unshift(finalAlert);
                })
            }
        })),
    );
}
