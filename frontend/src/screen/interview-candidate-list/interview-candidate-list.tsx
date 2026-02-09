import { useAppStore, useMainStore } from "@/store";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { InterviewCandidateTable } from "./table";
import CandidateDrawer, { CandidateInvite } from "@/components/candidate-left-sidebar/candidate-left-sidebar";
import { FileUploadDrawer } from "@/components/file-upload-drawer"
import { readExcel } from "@/lib/xlsx-reader";
import { interviewCandidateListSchema, interviewCandidateReportSchema } from "@/zod/interview";
import { AlertType } from "@/constants";
import { SiteHeader } from "@/components/site-header";
import { candidateInviteSchema } from "@/zod/candidate";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface InterviewCandidateList {
    id: string,
}

export const InterviewCandidateList = (props: InterviewCandidateList) => {
    const { id } = props;

    const getInterview = useMainStore().getInterview;
    const revaluate = useMainStore().revaluate
    const showAlert = useAppStore().showAlert;
    const sendCandidateInvite = useMainStore().sendInterviewCandidate
    const updateCandidateInvite = useMainStore().updateInterviewCandidate
    const getInterviewCandidate = useMainStore().getInterviewCandidateList;
    const getCandidateAttempt = useMainStore().getCandidateAttempt;

    const concludeInterview = useMainStore().concludeInterview;

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [sortState, setSortState] = useState<{ id: string, desc: boolean }>({ id: 'createdAt', desc: true });


    const interviewObj = useQuery({
        queryKey: ['interview', id],
        queryFn: () => {
            return getInterview(id)
        },
    });

    const candidateLists = useQuery({
        queryKey: ['interview-candidate-list', id, currentPage, pageSize, sortState.id, sortState.desc],
        queryFn: async () => {
            const res = await getInterviewCandidate(id, currentPage, pageSize, sortState.id, sortState.desc ? 'desc' : 'asc');
            return res;
        },
        enabled: !!interviewObj.data,
        refetchInterval: 4000,
        refetchIntervalInBackground: true,
    });

    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
    };

    const handlePageSizeChange = (newSize: number) => {
        setPageSize(newSize);
        setCurrentPage(1); // Reset to first page
    };

    const handleSortChange = (newSort: { id: string, desc: boolean }) => {
        setSortState(newSort);
        setCurrentPage(1); // Reset to first page on sort change
    };

    const saveCandidate = useMutation({
        mutationFn: async (data: CandidateInvite) => {
            return sendCandidateInvite(id, data);
        },
        onSuccess: () => {
            console.log("Candidate saved successfully");
        },
    });

    const updateCandidate = useMutation({
        mutationFn: async ({ candidateId, data }: { candidateId: string, data: CandidateInvite }) => {
            return updateCandidateInvite(id, candidateId, data);
        },
        onSuccess: () => {
            console.log("Candidate updated successfully");
        },
    });

    const handleCandidateInvite = useCallback(async (data: CandidateInvite, candidateId?: string) => {
        if (candidateId) {
            await updateCandidate.mutateAsync({ candidateId, data });
        } else {
            await saveCandidate.mutateAsync(data);
        }
        candidateLists.refetch();
        setOpenDrawable(false);
        setEditingCandidate(null);
    }, [saveCandidate, updateCandidate, candidateLists]);

    const getCandidateAttemptQuery = useMutation({
        mutationFn: (data: { interviewId: string, attemptId: string }) => {
            return getCandidateAttempt(data.interviewId, data.attemptId);
        },
        onSuccess: (data) => {
            setEditingCandidate(data);
            setOpenDrawable(true);
        },
        onError: (error) => {
            showAlert({
                time: 5,
                title: 'Unable to fetch candidate details',
                type: AlertType.error,
                message: error.message,
            });
        }
    });

    const handleEditCandidate = useCallback((candidate: typeof interviewCandidateListSchema._type) => {
        getCandidateAttemptQuery.mutate({ interviewId: id, attemptId: candidate.id });
    }, [getCandidateAttemptQuery, id]);

    const revaluateQuery = useMutation({
        mutationKey: ['revaluate'],
        mutationFn: async ({ id, prompt }: { id: string, prompt?: string }) => {
            const updatedId = await revaluate(id, prompt);
            if (updatedId) {
                showAlert({
                    time: 5,
                    title: 'Interview Attempt Re-evaluation Started',
                    type: AlertType.success,
                    message: prompt ? `Re-evaluating with custom instructions: "${prompt}"` : 'Evaluation has been added to the queue.',
                });
                candidateLists.refetch();
            }
        }
    })

    const revaluationFunction = useCallback(async (id: string, prompt?: string) => {
        await revaluateQuery.mutateAsync({ id, prompt });
    }, [revaluateQuery]);


    const concludeInterviewMutation = useMutation({
        mutationFn: (attemptId?: string) => {
            return concludeInterview(id, attemptId);
        },
        onSuccess: () => {
            showAlert({
                time: 5,
                title: 'Interview submission process started.',
                type: AlertType.success,
                message: 'Submission has been started.',
            });
        },
        onError: (error) => {
            showAlert({
                time: 5,
                title: 'Unable to conclude user interview.',
                type: AlertType.error,
                message: error.message,
            });
        }
    });

    const [fileUploadData, setFileUploadData] = useState<{ data: Array<typeof candidateInviteSchema._type>, error: Array<{ index: number, error: string, row: Record<string, any> }> } | null>(null);

    const [openDrawable, setOpenDrawable] = useState<boolean>(false);
    const [openBulkUpload, setOpenBulkUpload] = useState<boolean>(false);
    const [editingCandidate, setEditingCandidate] = useState<typeof interviewCandidateReportSchema._type | null>(null);
    
    // New state for validation and upload errors
    const [preValidationErrors, setPreValidationErrors] = useState<Array<{ row: Record<string, any>, error: string }>>([]);
    const [uploadErrors, setUploadErrors] = useState<Array<{ row: Record<string, any>, error: string }>>([]);
    const [showResultModal, setShowResultModal] = useState(false);
    const [processedCount, setProcessedCount] = useState(0);

    const downloadErrorSheet = useCallback(() => {
        const allErrors = [
            ...preValidationErrors,
            ...uploadErrors
        ];

        if (allErrors.length === 0) return;

        const errorData = allErrors.map(err => ({
            ...err.row,
            Reason: err.error
        }));

        const ws = XLSX.utils.json_to_sheet(errorData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Errors");
        XLSX.writeFile(wb, "upload_errors.xlsx");
    }, [preValidationErrors, uploadErrors]);

    const handleUpload = useCallback(async () => {
        const promiseArray: Array<Promise<any>> = [];
        const currentUploadErrors: Array<{ row: Record<string, any>, error: string }> = [];
        
        // Only valid data is in fileUploadData?.data
        const validData = fileUploadData?.data ?? [];
        
        validData.forEach((data) => {
             const promise = saveCandidate.mutateAsync(data)
                .catch((error) => {
                     currentUploadErrors.push({
                         row: data,
                         error: error instanceof Error ? error.message : "Unknown upload error"
                     });
                     return null; // Resolve to null so Promise.allSettled works smoothly or we can just use allSettled
                });
            promiseArray.push(promise);
        });

        await Promise.allSettled(promiseArray);
        
        setUploadErrors(currentUploadErrors);
        setProcessedCount(validData.length - currentUploadErrors.length);
        
        const totalErrors = preValidationErrors.length + currentUploadErrors.length;
        
        if (totalErrors > 0) {
            setShowResultModal(true);
        } else {
             showAlert({
                time: 5,
                title: 'All candidates invited successfully',
                type: AlertType.success,
            });
        }

        candidateLists.refetch();
        setFileUploadData(null);
        setOpenBulkUpload(false);
    }, [fileUploadData?.data, candidateLists, saveCandidate, preValidationErrors.length, showAlert]);


    const readBulkUpload = useCallback(async (files: Array<File> | File | null) => {
        const file = Array.isArray(files) ? files[0] : files;
        if (file) {
            const [data, error] = await readExcel(file, candidateInviteSchema);
            
            const now = new Date();
            const validData: Array<typeof candidateInviteSchema._type> = [];
            const validationErrors: Array<{ row: Record<string, any>, error: string }> = [];

            // Add schema validation errors first
             error.forEach(err => {
                validationErrors.push({
                    row: err.row || {}, // fallback if row is missing, though we added it
                    error: `Schema Error: ${err.error}`
                });
            });

            // Date validation
            data.forEach(record => {
                let isValid = true;
                let errorMessage = "";

                if (new Date(record.startTime) <= now) {
                    isValid = false;
                    errorMessage = "Start time must be greater than current time.";
                } else if (record.endTime && new Date(record.endTime) <= new Date(record.startTime)) {
                    isValid = false;
                    errorMessage = "End time must be greater than start time.";
                } else if (record.endTime && new Date(record.endTime) <= now) {
                     // explicit check though covered by endTime > startTime > now, but good for clarity
                    isValid = false;
                    errorMessage = "End time must be greater than current time.";
                }

                if (isValid) {
                    validData.push(record);
                } else {
                    validationErrors.push({
                        row: record,
                        error: errorMessage
                    });
                }
            });

            setPreValidationErrors(validationErrors);
            setUploadErrors([]); // Reset upload errors on new file read

            if (validationErrors.length) {
                showAlert({
                    time: 4,
                    title: "Validation Issues Found",
                    type: AlertType.warning,
                    message: `${validationErrors.length} item(s) failed validation. Only valid entries will be uploaded.`,
                });
            }

            setFileUploadData({
                data: validData,
                error: error, // Keep original schema errors for reference if needed, but we used them in preValidationErrors
            })
            
            if (validData.length > 0) {
                showAlert({
                    time: 4,
                    title: "File Processed",
                    type: AlertType.success,
                    message: `${validData.length} valid records ready for upload.`
                });
            }
        }
    }, [showAlert]);

    return (
        <>
            <SiteHeader
                breadcrumbs={[
                    { label: "Interviews", href: "/interview" },
                    { label: interviewObj?.data?.title || "Interview" },
                    { label: "Candidates" }
                ]}
            />
            <div className="flex flex-1 flex-col">
                <div className="@container/main flex flex-1 flex-col">
                    <div className="flex flex-col py-2">
                        <div>
                            <CandidateDrawer
                                open={openDrawable}
                                handleSaveData={(data) => handleCandidateInvite(data, editingCandidate?.id)}
                                setOpenDrawer={setOpenDrawable}
                                defaultValues={editingCandidate ? {
                                    name: editingCandidate.name,
                                    email: editingCandidate.email,
                                    phone: editingCandidate.phone,
                                    yearOfExperience: editingCandidate.yearOfExperience,
                                    startTime: new Date(editingCandidate.startTime),
                                    endTime: editingCandidate.endTime ? new Date(editingCandidate.endTime) : undefined,
                                    userSpecificDescription: editingCandidate.userSpecificDescription || "",
                                    attachments: editingCandidate.attachments,
                                } : undefined}
                                isEditing={!!editingCandidate}
                            />
                            <FileUploadDrawer
                                open={openBulkUpload}
                                showUploadButton={!!fileUploadData?.data.length}
                                uploadFile={handleUpload}
                                setOpenDrawer={setOpenBulkUpload}
                                defaultText="Upload in bulk"
                                acceptedFileTypes={{
                                    "excel": ["xlsx"],
                                }}
                                otherText="Add excel file"
                                onFilesUploaded={readBulkUpload}
                            />
                            
                            <Dialog open={showResultModal} onOpenChange={setShowResultModal}>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Upload Results</DialogTitle>
                                        <DialogDescription>
                                            Processed {processedCount} records successfully.
                                            {(preValidationErrors.length + uploadErrors.length) > 0 && (
                                                <span className="block mt-2 text-red-500">
                                                    {preValidationErrors.length + uploadErrors.length} records failed.
                                                </span>
                                            )}
                                        </DialogDescription>
                                    </DialogHeader>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setShowResultModal(false)}>
                                            Close
                                        </Button>
                                        {(preValidationErrors.length + uploadErrors.length) > 0 && (
                                            <Button onClick={downloadErrorSheet}>
                                                Download Failed Records
                                            </Button>
                                        )}
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>

                            <InterviewCandidateTable
                                revaluationFunction={revaluationFunction}
                                openBulkUploadDrawer={setOpenBulkUpload}
                                openCandidateDrawer={setOpenDrawable}
                                data={candidateLists.data?.data || []}
                                loading={candidateLists.isLoading}
                                interviewName={interviewObj?.data?.title || "Interview"}
                                interviewId={interviewObj.data?.id}
                                interviewObj={interviewObj.data}
                                concludeInterview={concludeInterviewMutation.mutateAsync}
                                onEditCandidate={handleEditCandidate}
                                // Pagination props
                                currentPage={currentPage}
                                totalPages={candidateLists.data?.pagination?.totalPages || 0}
                                pageSize={pageSize}
                                totalCount={candidateLists.data?.pagination?.total || 0}
                                onPageChange={handlePageChange}
                                onPageSizeChange={handlePageSizeChange}
                                onSortChange={handleSortChange}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}