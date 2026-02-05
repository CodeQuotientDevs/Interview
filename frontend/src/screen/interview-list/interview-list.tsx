import { useAppStore, useMainStore } from '@/store';
import { useMutation, useQuery } from '@tanstack/react-query';
import { InterviewDataTable } from './table';
import { useCallback, useEffect, useState } from 'react';
import { AlertType } from '@/constants';
import logger from '@/lib/logger';
import { SiteHeader } from "@/components/site-header";


export const InterviewList = () => {
    const getListItems = useMainStore().interviewList;
    const showAlert = useAppStore().showAlert;
    const cloneInterview = useMainStore().cloneInterview;

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [searchFilter, setSearchFilter] = useState("");
    const [sortState, setSortState] = useState({ id: "updatedAt", desc: true });

    const interviewListFetchResult = useQuery({
        queryKey: ['interview-list', currentPage, pageSize, searchFilter.trim(), sortState.id, sortState.desc],
        queryFn: () => getListItems(currentPage, pageSize, searchFilter.trim(), sortState.id, sortState.desc ? 'desc' : 'asc'),
    });

    const cloneMutation = useMutation({
        mutationFn: (id: string) => {
            return cloneInterview(id);
        },
        onError: (error) => {
            alert(error?.message ?? error);
        }
    });

    const cloneHandler = useCallback(async (id: string) => {
        const response = await cloneMutation.mutateAsync(id);
        logger.info(`Interview cloned: ${response}`);
        await interviewListFetchResult.refetch();
    }, [cloneMutation, interviewListFetchResult]);

    const handlePageChange = useCallback((page: number) => {
        setCurrentPage(page);
    }, []);

    const handleSearchChange = useCallback((value: string) => {
        setCurrentPage(1); 
        setSearchFilter(value);
    }, []);

    const handleSortChange = useCallback((columnId: string, desc: boolean) => {
        setCurrentPage(1); 
        setSortState({ id: columnId, desc });
    }, []);

    const handlePageSizeChange = useCallback((size: number) => {
        setPageSize(size);
        setCurrentPage(1);
    }, []);

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

    const pagination = interviewListFetchResult.data?.pagination;

    return (
        <>
            <SiteHeader title="Interviews" />
            <div className="flex flex-1 flex-col">
                <div className="@container/main flex flex-1 flex-col">
                    <div className="flex flex-col py-2">
                        <div>
                            <InterviewDataTable
                                data={interviewListFetchResult.data?.data ?? []}
                                loading={interviewListFetchResult.isLoading}
                                cloneInterview={cloneHandler}
                                searchFilter={searchFilter}
                                onSearchChange={handleSearchChange}
                                sortState={sortState}
                                onSortChange={handleSortChange}
                                currentPage={pagination?.page || 1}
                                totalPages={pagination?.totalPages || 1}
                                pageSize={pageSize}
                                onPageChange={handlePageChange}
                                onPageSizeChange={handlePageSizeChange}
                                totalCount={pagination?.total || 0}
                            />

                            {/* Pagination Controls Removed */}
                            {/* {pagination && pagination.totalPages > 1 && (
                                <div className="flex items-center justify-between px-4 lg:px-6 py-4">
                                ...
                                </div>
                            )} */}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
