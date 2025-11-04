import { useAppStore, useMainStore } from "@/store";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { InterviewCandidateTable } from "./table";
import CandidateDrawer, { CandidateInvite } from "@/components/candidate-left-sidebar/candidate-left-sidebar";
import { FileUploadDrawer } from "@/components/file-upload-drawer"
import logger from "@/lib/logger";
import { readExcel } from "@/lib/xlsx-reader";
import { candidateInviteSchema } from "@/zod/candidate";
import { AlertType } from "@/constants";

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
    const getInterviewCandidate = useMainStore().getInterviewCandidateList;

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
    })

    const [fileUploadData, setFileUploadData] = useState<{ data: Array<typeof candidateInviteSchema._type>, error:  Array<{ index: number, error: string }>} | null>(null);

    const [openDrawable, setOpenDrawable] = useState<boolean>(false);
    const [openBulkUpload, setOpenBulkUpload] = useState<boolean>(false);

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

    const handleCandidateInvite = useCallback(async (data: CandidateInvite) => {
        try {
            const response = await saveCandidate.mutateAsync(data);
            if (response) {
                candidateLists.refetch();
            }
        } catch (error) {
            logger.error(error);
        }
    }, [candidateLists, saveCandidate]);

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



    const readBulkUpload = useCallback( async (files: Array<File> | File | null) => {
        const file = Array.isArray(files)?files[0]:files;
        if (file) {
            const [data, error] = await readExcel<typeof candidateInviteSchema.shape>(file, candidateInviteSchema);
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
        }
        if (file) {
            showAlert({
                time: 4,
                title: "Bulk Upload Success",
                type: AlertType.success,
                message: `file added successfully`
            });
        }
    }, [showAlert]);

    return (
        <div className="container mx-auto p-4 w-full h-full">
            <CandidateDrawer
                open={openDrawable}
                handleSaveData={handleCandidateInvite}
                setOpenDrawer={setOpenDrawable}
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
            <div className=" p-6 w-full h-fit">
                <InterviewCandidateTable
                    revaluationFunction={revaluateQuery.mutateAsync}
                    openBulkUploadDrawer={setOpenBulkUpload}
                    openCandidateDrawer={setOpenDrawable}
                    data={candidateLists.data ?? []}
                    loading={candidateLists.isLoading}

                    interviewName={interviewObj?.data?.title || "Interview"}
                    interviewId={interviewObj.data?.id}
                    concludeInterview={concludeInterviewMutation.mutateAsync}
                />
            </div>
        </div>
    )
}