import { useAppStore } from '@/store';
import React, { useEffect } from 'react';
import { Loader } from '@/components/ui/loader';
import LoginPage from '@/screen/login/login';

interface ProtectedRouteProps {
    children: React.ReactElement
}

export const ProtectedRoute = (props: ProtectedRouteProps) => {
    const getSession = useAppStore().getSession;
    const session = useAppStore().session;
    const initalLoadCompleted = useAppStore().initalLoadCompleted;
    useEffect(() => {
        getSession();
    }, [getSession]);

    if (!initalLoadCompleted) {
        return (
            <Loader />
        )
    }

    if (!session?.userId) {
        return <LoginPage />
    }

    return (
        <>
            {props.children}
        </>
    )
}