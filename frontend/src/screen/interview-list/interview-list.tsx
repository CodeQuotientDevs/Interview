import { useAppStore, useMainStore } from '@/store';
import { useMutation, useQuery } from '@tanstack/react-query';
import { InterviewDataTable } from './table';
import { useCallback, useEffect } from 'react';
import { AlertType } from '@/constants';
import logger from '@/lib/logger';
import { SiteHeader } from "@/components/site-header";

export const InterviewList = () => {
    const getListItems = useMainStore().interviewList;
    const showAlert = useAppStore().showAlert;
    const cloneInterview = useMainStore().cloneInterview;
    const interviewListFetchResult = useQuery({
        queryKey: ['interview-list'],
        queryFn: getListItems,
    });

    const cloneMutation  = useMutation({
        mutationFn: (id: string) => {
            return cloneInterview(id);
        },
        onError: (error) => {
            alert(error?.message ?? error);
        }
    });

    const cloneHandler = useCallback( async (id: string) => {
        const response = await cloneMutation.mutateAsync(id);
        logger.info(`Interview cloned: ${response}`);
        await interviewListFetchResult.refetch();
    }, [cloneMutation, interviewListFetchResult]);

    useEffect(() => {
        if (interviewListFetchResult.error) {
            showAlert({
                time: 4,
                title: "Error Fetching Interview List",
                type: AlertType.error,
                message: interviewListFetchResult.error.message
            });
        }
    }, [interviewListFetchResult.error, showAlert]);

    return (
        <>
            <SiteHeader title="Interviews" />
            <div className="flex flex-1 flex-col">
                <div className="@container/main flex flex-1 flex-col">
                    <div className="flex flex-col py-2">
                        <div>
                            <InterviewDataTable
                                data={interviewListFetchResult.data ?? []}
                                loading={interviewListFetchResult.isLoading}
                                cloneInterview={cloneHandler}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
