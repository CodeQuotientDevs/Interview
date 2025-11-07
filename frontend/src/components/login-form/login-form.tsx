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
		<GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}> 
			<Form {...form}>
				<form
					onSubmit={form.handleSubmit(handleLogin)}
					className={cn("flex flex-col gap-8 border border-gray-300 rounded-lg px-10 py-8", className)}
					{...props}
				>
					<div className="flex flex-col items-center gap-2 text-center">
						<h1 className="text-2xl font-bold">Login to your account</h1>
					</div>
					<div className="grid gap-6">
						<GoogleLogin
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
		</GoogleOAuthProvider>
	);
}
