import { useParams } from "react-router";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Loader } from "@/components/ui/loader";
import { CheckCircle, XCircle, AlertCircle, Trophy, Target, MessageSquare, Code } from "lucide-react";

import { useAppStore, useMainStore } from "@/store";
import { AlertType } from "@/constants";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";

// Type definitions based on Zod schema
type DetailedReport = {
    topic: string;
    score: number;
    detailedReport: string;
    questionsAsked: Array<{
        userAnswer: string;
        question: string;
        remarks: string;
        score: number;
    }>;
};

// type ReportData = {
//     id: string;
//     name: string;
//     email: string;
//     startTime: Date;
//     endTime?: Date;
//     completedAt: Date;
//     score: number;
//     summaryReport: string;
//     detailedReport?: DetailedReport[];
//     interview?: {
//         id: string;
//         title: string;
//     };
// };

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

    // Helper function to get score color
    const getScoreColor = (score: number) => {
        if (score >= 80) return "text-green-600 bg-green-50 border-green-200";
        if (score >= 60) return "text-yellow-600 bg-yellow-50 border-yellow-200";
        return "text-red-600 bg-red-50 border-red-200";
    };

    // Helper function to get progress bar color
    const getProgressColor = (score: number) => {
        if (score >= 80) return "bg-green-500";
        if (score >= 60) return "bg-yellow-500";
        return "bg-red-500";
    };

    // Helper function to get score icon
    const getScoreIcon = (score: number) => {
        if (score >= 80) return <CheckCircle className="w-4 h-4" />;
        if (score >= 60) return <AlertCircle className="w-4 h-4" />;
        return <XCircle className="w-4 h-4" />;
    };

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
                        <div className="px-4 lg:px-6 space-y-6">
                            {/* Candidate Overview Card */}
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="flex items-center gap-2">
                                                <Trophy className="w-5 h-5 text-yellow-500" />
                                                {reportData.name}'s Interview Report
                                            </CardTitle>
                                            <CardDescription>
                                                Interview: {reportData.interview?.title || 'N/A'} • 
                                                Completed: {reportData.completedAt ? new Date(reportData.completedAt).toLocaleDateString() : 'N/A'}
                                            </CardDescription>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-3xl font-bold text-primary">
                                                {reportData.score}/100
                                            </div>
                                            <div className="text-sm text-muted-foreground">Overall Score</div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm font-medium">Performance</span>
                                                <span className="text-sm text-muted-foreground">{reportData.score}%</span>
                                            </div>
                                            <Progress value={reportData.score} fillColor={getProgressColor(reportData.score ?? 0)} className="h-3" />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-blue-600">
                                                    {(reportData.detailedReport ?? []).length}
                                                </div>
                                                <div className="text-sm text-muted-foreground">Topics Covered</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-green-600">
                                                    {(reportData.detailedReport ?? []).reduce((acc: number, report: DetailedReport) => 
                                                        acc + (report.questionsAsked?.length || 0), 0)}
                                                </div>
                                                <div className="text-sm text-muted-foreground">Questions Asked</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-purple-600">
                                                    {reportData.completedAt ? new Date(reportData.completedAt).toLocaleString() : 'N/A'}
                                                </div>
                                                <div className="text-sm text-muted-foreground">Completed At</div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Summary Report Card */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <MessageSquare className="w-5 h-5" />
                                        Interview Summary
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="prose prose-sm max-w-none">
                                        <p className="text-muted-foreground leading-relaxed">
                                            {reportData.summaryReport}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Topic-wise Detailed Reports */}
                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold flex items-center gap-2">
                                    <Target className="w-5 h-5" />
                                    Topic-wise Analysis
                                </h2>
                                
                                <Accordion type="multiple" className="w-full space-y-4">
                                    {(reportData.detailedReport ?? []).map((report: DetailedReport, index: number) => (
                                        <AccordionItem key={report.topic} value={report.topic} className="border rounded-lg overflow-hidden">
                                            <AccordionTrigger className="px-6 py-4 hover:no-underline">
                                                <div className="flex items-center justify-between w-full">
                                                    <div className="flex items-center gap-3">
                                                        <Code className="w-4 h-4" />
                                                        <span className="text-lg font-medium">{report.topic}</span>
                                                    </div>
                                                    <Badge 
                                                        variant="outline" 
                                                        className={`flex items-center gap-1 mr-2 ${getScoreColor(report.score)}`}
                                                    >
                                                        {getScoreIcon(report.score)}
                                                        {report.score}/100
                                                    </Badge>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="px-6 pb-4">
                                                <div className="space-y-4">
                                                    <div>
                                                        <Progress value={report.score} fillColor={getProgressColor(report.score)} className="h-2" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-medium mb-2 text-muted-foreground">Detailed Feedback</h4>
                                                        <p className="text-sm leading-relaxed">{report.detailedReport}</p>
                                                    </div>
                                                    
                                                    <Separator />
                                                    
                                                    <div>
                                                        <h4 className="font-medium mb-3 flex items-center gap-2">
                                                            <MessageSquare className="w-4 h-4" />
                                                            Questions & Answers ({report.questionsAsked.length})
                                                        </h4>
                                                        <Accordion type="single" collapsible className="w-full">
                                                            {report.questionsAsked.map((question: DetailedReport['questionsAsked'][0], qIndex: number) => (
                                                                <AccordionItem key={qIndex} value={`q-${index}-${qIndex}`}>
                                                                    <AccordionTrigger className="text-left">
                                                                        <div className="flex items-start gap-3 w-full">
                                                                            <Badge variant="secondary" className="mt-0.5">
                                                                                {qIndex + 1}
                                                                            </Badge>
                                                                            <div className="flex-1">
                                                                                <p className="text-sm font-medium leading-tight">
                                                                                    {question.question}
                                                                                </p>
                                                                                <p className="text-xs text-muted-foreground mt-1">
                                                                                    Score: {question.score}/100
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    </AccordionTrigger>
                                                                    <AccordionContent>
                                                                        <div className="space-y-4 pl-11">
                                                                            <div>
                                                                                <h5 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-1">
                                                                                    <CheckCircle className="w-3 h-3" />
                                                                                    Candidate's Answer
                                                                                </h5>
                                                                                <div className="bg-green-50 border border-green-200 rounded-md p-3">
                                                                                    <p className="text-sm text-green-800">
                                                                                        {question.userAnswer || "No answer provided"}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                            <div>
                                                                                <h5 className="text-sm font-medium text-blue-700 mb-2 flex items-center gap-1">
                                                                                    <AlertCircle className="w-3 h-3" />
                                                                                    AI Evaluation & Remarks
                                                                                </h5>
                                                                                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                                                                                    <p className="text-sm text-blue-800">
                                                                                        {question.remarks || "No remarks provided"}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </AccordionContent>
                                                                </AccordionItem>
                                                            ))}
                                                        </Accordion>
                                                    </div>
                                                </div>
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