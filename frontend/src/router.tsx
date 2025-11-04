import { 
    createBrowserRouter,
    createRoutesFromElements,
    Route,
    useParams,
    Navigate,
    useSearchParams,
} from "react-router";
import { lazy, Suspense } from "react";
import { InterviewList } from "./screen/interview-list/interview-list";
import { ProtectedRoute } from "./components/protected-route";
import { ErrorPage } from "./screen/error-page";
import { InterviewCandidateList } from "./screen/interview-candidate-list";
// import { MainScreen } from "./screen/main-screen";
import { AppLoader } from "./components/app-loader";
import { InterviewCreation } from "./screen/interview-creation";
import { Dashboard } from "./screen/dashboard";
import Mainlayout from "./components/layout/main-layout";
import LoginPage from "./screen/login/login";

const Interview = lazy(() => import("./screen/interview/lazy"));

const InterviewPageWrapper = () => {
    const { id } = useParams();
    console.log('ID TO GET',id);
    return <Interview id={id || ""} />;
};

const InterviewListPageWrapper = () => {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const attemptId = searchParams.get('userid') || undefined;
    return <InterviewCandidateList id={id!} activeReportId={attemptId} />
}

const InterviewCreationPageWrapper = () => {
    const { id } = useParams();
    return <InterviewCreation id={id} />
}

export const Routes = createBrowserRouter(
    createRoutesFromElements(
        <Route
            path="/"
            errorElement={<ErrorPage statusCode={404} errorMessage="Page not found." />}
        >
            <Route path="login" element={<LoginPage />}/>
            <Route path="" element={<Mainlayout />}>
            <Route index element={ <>
                        <ProtectedRoute>
                            <Dashboard/>
                        </ProtectedRoute>
                    </> } />
                <Route path="dashboard" element={
                    <>
                        <ProtectedRoute>
                            <Dashboard/>
                        </ProtectedRoute>
                    </>
                }>
                </Route>
                <Route path="interview" >
                    <Route path="" element= {
                        <>
                            <ProtectedRoute>
                                <InterviewList />
                            </ProtectedRoute>
                        </>
                    } />
                    <Route path="candidates/:id" element={
                        <>
                            <ProtectedRoute>
                                <InterviewListPageWrapper />
                            </ProtectedRoute>
                        </>
                    } />
                    <Route path="add">
                        <Route path=":id" element={
                            <>
                                <ProtectedRoute>
                                    <InterviewCreationPageWrapper />
                                </ProtectedRoute>
                            </>
                        }/>
                        <Route path="" element={
                            <>
                                <ProtectedRoute>
                                    <InterviewCreationPageWrapper />
                                </ProtectedRoute>
                            </>
                        } />
                    </Route>
                </Route>
                <Route path="candidates">
                    <Route path=":id" element={
                        <>
                            <Suspense fallback={<AppLoader loading={true} children={<></>} />}>
                                <InterviewPageWrapper />
                            </Suspense>
                        </>
                    } />
                </Route>
            </Route>
            <Route path="/" element={<Navigate to={"/interview"} replace />} />
        </Route>
    )
);
