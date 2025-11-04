import { useParams } from "react-router";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader } from "@/components/ui/loader";

import { useAppStore, useMainStore } from "@/store";
import { AlertType } from "@/constants";
import { useQuery } from "@tanstack/react-query";

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



    if (reportQuery.isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader />
            </div>
        );
    }

    if (!reportQuery.data) {
        return (
            <div className="container mx-auto py-8">
                <div className="text-center py-8">
                    <p>No report data found for this candidate.</p>
                </div>
            </div>
        );
    }

    const reportData = reportQuery.data;

    return (
        <div className="container mx-auto py-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Detailed Report</h1>
                <p className="text-muted-foreground">{reportData.name}'s Interview Report</p>
            </div>

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
    );
}