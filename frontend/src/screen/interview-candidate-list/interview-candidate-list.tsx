import { useAppStore, useMainStore } from "@/store";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { InterviewCandidateTable } from "./table";
import CandidateDrawer, { CandidateInvite } from "@/components/candidate-left-sidebar/candidate-left-sidebar";
import { FileUploadDrawer } from "@/components/file-upload-drawer"
import logger from "@/lib/logger";
import { readExcel } from "@/lib/xlsx-reader";
import { interviewCandidateListSchema, interviewCandidateReportSchema } from "@/zod/interview";
import { AlertType } from "@/constants";
import { SiteHeader } from "@/components/site-header";
import { candidateInviteSchema } from "@/zod/candidate";

interface InterviewCandidateList {
    id: string,
}

export const InterviewCandidateList = (props: InterviewCandidateList) => {
    const { id } = props;

    const navigatorR = useNavigate();
    const setAppLoader = useAppStore().setAppLoader;
    const getInterview = useMainStore().getInterview;
    const revaluate = useMainStore().revaluate
	const showAlert = useAppStore().showAlert;
    const sendCandidateInvite = useMainStore().sendInterviewCandidate
    const updateCandidateInvite = useMainStore().updateInterviewCandidate
    const getInterviewCandidate = useMainStore().getInterviewCandidateList;

    const getCandidateAttempt = useMainStore().getCandidateAttempt;

    const concludeInterview = useMainStore().concludeInterview;

    const interviewObj = useQuery({
        queryKey: ['interview', id],
        queryFn: () => {
            return getInterview(id)
        },
    });
    const candidateLists = useQuery({
        queryKey: ['interview-candidate-list', id],
        queryFn: () => {
            return getInterviewCandidate(id)
        },
        enabled: !!interviewObj.data
    });

    const saveCandidate = useMutation({
        mutationFn: async (data: CandidateInvite) => {
            return sendCandidateInvite(id, data);
        },
        onSuccess: () => {
            console.log("Candidate saved successfully");
        },
    });



    const revaluateQuery = useMutation({
        mutationKey: ['revaluate'],
        mutationFn: async (id: string) => {
            const updatedId = await revaluate(id);
            if (updatedId) {
                showAlert({
                    time: 5,
                    title: 'Interview Attempt Revaluated',
                    type: AlertType.success,
                });
                candidateLists.refetch();
            }
        }
    })


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

    const [fileUploadData, setFileUploadData] = useState<{ data: Array<typeof candidateInviteSchema._type>, error:  Array<{ index: number, error: string }>} | null>(null);

    const [openDrawable, setOpenDrawable] = useState<boolean>(false);
    const [openBulkUpload, setOpenBulkUpload] = useState<boolean>(false);
    const [editingCandidate, setEditingCandidate] = useState<typeof interviewCandidateReportSchema._type | null>(null);

    const handleUpload = useCallback(async () => {
        const promiseArray: Array<Promise<string>> = [];
        (fileUploadData?.data ?? []).forEach((data) => {
            promiseArray.push(saveCandidate.mutateAsync(data))
        });
        const responses = await Promise.allSettled(promiseArray);
        logger.info(responses);
        candidateLists.refetch();
        setFileUploadData(null);
        setOpenBulkUpload(false);
        logger.info(fileUploadData?.data);
    }, [fileUploadData?.data, candidateLists, saveCandidate]);

    const handleCandidateInvite = useCallback(async (data: CandidateInvite, candidateId?: string) => {
        try {
            if (candidateId) {
                // Update existing candidate
                const response = await updateCandidateInvite(id, candidateId, data);
                if (response) {
                    candidateLists.refetch();
                    setOpenDrawable(false);
                    setEditingCandidate(null);
                    showAlert({
                        time: 5,
                        title: 'Candidate updated successfully',
                        type: AlertType.success,
                    });
                }
            } else {
                // Create new candidate
                const response = await saveCandidate.mutateAsync(data);
                if (response) {
                    candidateLists.refetch();
                    setOpenDrawable(false);
                    showAlert({
                        time: 5,
                        title: 'Candidate invited successfully',
                        type: AlertType.success,
                    });
                }
            }
        } catch (error) {
            logger.error(error);
            showAlert({
                time: 5,
                title: 'Unable to save candidate',
                type: AlertType.error,
                message: error instanceof Error ? error.message : 'Unknown error occurred',
            });
            // Modal stays open on error - no setOpenDrawable(false) or setEditingCandidate(null)
        }
    }, [candidateLists, saveCandidate, updateCandidateInvite, id, showAlert]);

    const handleEditCandidate = useCallback((candidate: typeof interviewCandidateListSchema._type) => {
        if (interviewObj.data?.id) {
            getCandidateAttemptQuery.mutate({
                interviewId: interviewObj.data.id,
                attemptId: candidate.id
            });
        }
    }, [interviewObj.data?.id, getCandidateAttemptQuery]);

    useEffect(() => {
        setAppLoader(interviewObj.isLoading)
    }, [interviewObj.isLoading, setAppLoader]);

    useEffect(() => {
        if (interviewObj.error) {
            showAlert({
				time: 4,
				title: "Something went wrong",
				type: AlertType.error,
				message: interviewObj.error?.message
			});
            navigatorR(`/interview`);
        }
    }, [interviewObj.error, navigatorR, showAlert]);

    useEffect(() => {
        logger.info('Data: ');
        logger.info(candidateLists.data);
    }, [candidateLists.data]);

    useEffect(() => {
        if (!openBulkUpload) {
            setFileUploadData(null);
        }
    }, [openBulkUpload]);

    useEffect(() => {
        if (!openDrawable) {
            setEditingCandidate(null);
        }
    }, [openDrawable]);



    const readBulkUpload = useCallback( async (files: Array<File> | File | null) => {
        const file = Array.isArray(files)?files[0]:files;
        if (file) {
            const [data, error] = await readExcel(file, candidateInviteSchema);
            if (error.length) {
                showAlert({
                    time: 4,
                    title: "Something went wrong",
                    type: AlertType.error,
                    message: `${error.length} content is not valid please recheck this file`
                });
            }
            setFileUploadData({
                data,
                error,
            })
            logger.info(data);
            if (data.length > 0) {
                showAlert({
                    time: 4,
                    title: "Bulk upload success",
                    type: AlertType.success,
                    message: `file added successfully`
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
                    userSpecificDescription: editingCandidate.userSpecificDescription || ""
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
                            <InterviewCandidateTable
                                revaluationFunction={revaluateQuery.mutateAsync}
                                openBulkUploadDrawer={setOpenBulkUpload}
                                openCandidateDrawer={setOpenDrawable}
                                data={candidateLists.data ?? []}
                                loading={candidateLists.isLoading}
                                interviewName={interviewObj?.data?.title || "Interview"}
                                interviewId={interviewObj.data?.id}
                                interviewObj={interviewObj.data}
                                concludeInterview={concludeInterviewMutation.mutateAsync}
                                onEditCandidate={handleEditCandidate}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}