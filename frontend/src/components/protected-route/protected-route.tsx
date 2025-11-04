import { useAppStore } from '@/store';
import React, { useEffect } from 'react';
import { Loader } from '@/components/ui/loader';
import { useNavigate } from 'react-router';

interface ProtectedRouteProps {
    children: React.ReactElement
}

export const ProtectedRoute = (props: ProtectedRouteProps) => {
    const getSession = useAppStore().getSession;
    const session = useAppStore().session;
    const initalLoadCompleted = useAppStore().initalLoadCompleted;
    const navigate = useNavigate();
    useEffect(() => {
        getSession();
    }, [getSession]);

    if (!initalLoadCompleted) {
        return (
            <Loader />
        )
    }

    if (!session?.userId) {
        navigate('/login');
    }

    return (
        <>
            {props.children}
        </>
    )
}