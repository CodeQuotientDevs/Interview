
import { LoginForm } from "@/components/login-form"
import { useEffect } from "react";
import { useAppStore } from "@/store";
import { Loader } from "@/components/ui/loader";
import { useNavigate } from "react-router";
import { toast } from "sonner";

export default function LoginPage() {
  const getSession = useAppStore().getSession;
  const initalLoadCompleted = useAppStore().initalLoadCompleted;
  const session = useAppStore().session;
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
    toast.info("Session expired. Please log in again.");
  } else {
    navigate('/dashboard');
  }
  return (
    <div className="grid min-h-[calc(100vh-60px)]">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-md flex flex-col gap-8 items-center">
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  )
}
