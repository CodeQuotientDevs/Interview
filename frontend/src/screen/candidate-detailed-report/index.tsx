import { useParams } from "react-router";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader } from "@/components/ui/loader";

import { useAppStore, useMainStore } from "@/store";
import { AlertType } from "@/constants";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";

export function CandidateDetailedReport() {
    const { interviewId, candidateId } = useParams();
    const showAlert = useAppStore().showAlert;
    const getCandidateAttempt = useMainStore().getCandidateAttempt;

    const reportQuery = useQuery({
        queryKey: ['candidate-report', interviewId, candidateId],
        queryFn: () => {
            return getCandidateAttempt(interviewId!, candidateId!);
        },
        enabled: !!(interviewId && candidateId),
        retry: false,
    });

    // Handle errors
    if (reportQuery.error) {
        showAlert({
            time: 5,
            title: 'Error loading report',
            type: AlertType.error,
            message: 'Failed to load the detailed report. Please try again.'
        });
    }

    const getBreadcrumbs = (candidateName?: string) => {
        // TODO: Get interview title from API response when available
        const interviewTitle = reportQuery.data?.interview.title ?? "[Interview Name]"; // Placeholder for now
        return [
            { label: "Interviews", href: "/interview" },
            { label: interviewTitle, href: `/interview/candidates/${interviewId}` },
            { label: "Candidates", href: `/interview/candidates/${interviewId}` },
            { label: candidateName ? `${candidateName}'s Report` : "Report" }
        ];
    };



    if (reportQuery.isLoading) {
        return (
            <>
                <SiteHeader 
                    breadcrumbs={getBreadcrumbs()}
                    showBack={true}
                    backTo={`/interview/candidates/${interviewId}`}
                />
                <div className="flex flex-1 flex-col">
                    <div className="flex justify-center items-center h-64">
                        <Loader />
                    </div>
                </div>
            </>
        );
    }

    if (!reportQuery.data) {
        return (
            <>
                <SiteHeader 
                    breadcrumbs={getBreadcrumbs()}
                    showBack={true}
                    backTo={`/interview/candidates/${interviewId}`}
                />
                <div className="flex flex-1 flex-col">
                    <div className="@container/main flex flex-1 flex-col">
                        <div className="flex flex-col py-2">
                            <div className="px-4 lg:px-6">
                                <div className="text-center py-8">
                                    <p>No report data found for this candidate.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    const reportData = reportQuery.data;

    return (
        <>
            <SiteHeader 
                breadcrumbs={getBreadcrumbs(reportData.name)}
                showBack={true}
                backTo={`/interview/candidates/${interviewId}`}
            />
            <div className="flex flex-1 flex-col">
                <div className="@container/main flex flex-1 flex-col">
                    <div className="flex flex-col py-2">
                        <div className="px-4 lg:px-6">
                            <div className="bg-white rounded-lg border p-6">
                <Accordion className="w-full" type="single" collapsible>
                    <AccordionItem value="Summary">
                        <AccordionTrigger>
                            <div className="flex justify-between items-center w-full">
                                <p>Summary</p>
                                <p className="mr-2">
                                    Score: {reportData.score}
                                </p>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pl-4">
                            {reportData.summaryReport}
                        </AccordionContent>
                    </AccordionItem>
                    
                    {(reportData.detailedReport ?? []).map((report: any) => (
                        <AccordionItem key={report.topic} value={report.topic}>
                            <AccordionTrigger>
                                <div className="flex justify-between items-center w-full">
                                    <p>{report.topic}</p>
                                    <p className="mr-2">
                                        Score: {report.score}
                                    </p>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pl-4">
                                <p className="mb-4">{report.detailedReport}</p>
                                
                                <Accordion className="w-full" type="single" collapsible>
                                    {report.questionsAsked.map((question: any, index: number) => (
                                        <AccordionItem key={index} value={question.question}>
                                            <AccordionTrigger>
                                                <div>
                                                    <p>{index + 1}. {question.question}</p>
                                                    <p className="text-sm text-muted-foreground">Score: {question.score}</p>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                                <div className="pl-4 space-y-4">
                                                    <div>
                                                        <h4 className="font-semibold mb-2">User Answer:</h4>
                                                        <p className="text-sm">{question.userAnswer}</p>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold mb-2">Remarks:</h4>
                                                        <p className="text-sm">{question.remarks}</p>
                                                    </div>
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                                </Accordion>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}