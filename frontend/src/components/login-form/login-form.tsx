import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { GoogleLogin } from '@react-oauth/google';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Form } from "../ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback } from "react";
import * as z from "zod";
import { useAppStore } from "@/store";
import { AlertType } from "@/constants";
import { useMutation } from "@tanstack/react-query";
import { CodeQuotientIcon } from "../logo";

// Define the login schema using Zod
const loginSchema = z.object({
	email: z.string().email({ message: "Invalid email address" }),
	password: z.string().min(1),
});

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<"form">) {
	const form = useForm<z.infer<typeof loginSchema>>({
		resolver: zodResolver(loginSchema),
		defaultValues: {
			email: "",
			password: "",
		},
	});
	const showAlert = useAppStore().showAlert;
	const loginHandler = useAppStore().login;
	const loginWithGoogle = useAppStore().loginWithGoogle;

	const handleLoginWithGoogle = useMutation({
		mutationKey: ['login', 'google'],
		mutationFn: async (credKey: string) => {
			await loginWithGoogle(credKey);
		},
		onError: (err: Error) => {
			console.error(err);
		}
	})

	const handleLogin = useCallback(async (data: z.infer<typeof loginSchema>) => {
		try {
			await loginHandler(data);
		} catch (error) {
			const errorMessage = typeof error === 'string' ? error : (error instanceof Error ? error.message : '');
			showAlert({
				time: 4,
				title: "Something went wrong",
				type: AlertType.error,
				message: errorMessage
			});
		}
	}, [loginHandler, showAlert]);

	return (
		<div className="w-full flex flex-col justify-center items-center bg-white p-4">
		<GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}> 
			<div className="flex flex-col items-center gap-6 max-w-md w-full text-center">
				<div className="">
		        <CodeQuotientIcon className="h-[80px]"/>
				</div>
				<div className="flex flex-col items-center gap-6 max-w-md w-full text-center">
					<h1 className="text-3xl font-bold">Welcome to CodeQuotient</h1>
					<p className="text-gray-600 mt-1">Access the interview dashboard</p>
				</div>
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(handleLogin)}
						className={cn("flex flex-col gap-8 ", className)}
						{...props}
					>
						<div className="grid gap-6">
							<GoogleLogin
							width={"500px"}
							theme="filled_blue"
								onSuccess={credentialResponse => {
									if (credentialResponse.credential) {
										handleLoginWithGoogle.mutate(credentialResponse.credential);
									}
								}}
							>
							</GoogleLogin>
						</div>
					</form>
				</Form>
				<div className="bg-gray-100 p-4 rounded-xl text-sm flex gap-2 items-start w-full max-w-md">
					<span className="text-red-500 mt-0.5">⚠️</span>
					<p className="text-gray-700 text-left">This is a secure admin access point. Authorized personnel only.</p>
					</div>

					<div className="text-center text-xs text-gray-500 mt-6">
					<p>© CodeQuotient. All rights reserved.</p>
				</div>
			</div>
		</GoogleOAuthProvider>

		</div>
	);
}
