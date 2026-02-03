import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";



import { Loader2 } from "lucide-react";
import MultiSelect, { Option } from "@/components/ui/multi-select";
import { interviewCreateSchema, interviewGetSchema } from "@/zod/interview";
import { useAppStore, useMainStore } from "@/store"
import { useNavigate } from "react-router";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, Form } from "@/components/ui/form";
import { useQuery } from "@tanstack/react-query";
import { AlertType } from "@/constants";
// import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectLabel, SelectItem } from "@/components/ui/select";
import logger from "@/lib/logger";
import { zodResolver } from "@hookform/resolvers/zod";
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Separator } from "@/components/ui/separator";
// import { useMutation, useQueries, useQuery } from "@tanstack/react-query";
// import { QuestionListEditor } from "@/components/question-list-editor/question-list-editor";
import { TopicCard } from "@/components/interview-creation/topic-card";

interface CandidatePageProps {
	id?: string
}

export function InterviewCreation(props: CandidatePageProps) {
	const { id } = props;
	const form = useForm<typeof interviewCreateSchema._type>({
		resolver: zodResolver(interviewCreateSchema),
		defaultValues: {
			difficulty: {},
			duration: 0,
			generalDescriptionForAi: "",
			title: "",
			keywords: [],
		}
	});
	const {
		control,
		handleSubmit,
		register,
		setValue,
		watch,
	} = form;





	const showAlert = useAppStore().showAlert;
	const setAppLoader = useAppStore().setAppLoader;
	const navigatorR = useNavigate();
	const addInterview = useMainStore().addInterview;
	const updateInterview = useMainStore().updateInterview;
	const getInterview = useMainStore().getInterview;

	const previousInterviewFetch = useQuery({
		queryKey: ['getInterview', id],
		queryFn: () => getInterview(id!),
		enabled: !!id,
	});

	const [loading, setLoading] = useState<boolean>(false);
	const [selectedTopics, setSelectedTopics] = useState<Array<string>>([]);
	const [selectedOptions, setSelectedOptions] = useState<Array<{ label: string, value: string }>>([])

	const difficultyData = watch("difficulty");
	const totalWeightage = useMemo(() => {
		const difficulties = Object.values(difficultyData || {});
		return difficulties.reduce((sum: number, item: any) => sum + (Number(item?.weight) || 0), 0);
	}, [difficultyData]);

	const defaultOptions = useMemo(() => (
		[
			{ label: "JavaScript", value: "javascript" },
			{ label: "React", value: "react" },
			{ label: "NodeJS", value: "nodejs" },
		]
	), []);

	const defaultOptionsValueToNameObj = useMemo(() => {
		const valueToLabelObj: Record<string, string> = {};
		defaultOptions.forEach((ele) => {
			valueToLabelObj[ele.value] = ele.label;
		});
		return valueToLabelObj;
	}, [defaultOptions]);

	const handleSelectedTopics = useCallback((data: Array<Option>) => {
		setSelectedOptions((prevSelected) => {
			let change = false;
			const prevSelectedSet = new Set(prevSelected.map(ele => ele.value));
			data.forEach((value) => {
				if (!prevSelectedSet.has(value.value)) {
					change = true;
				}
				prevSelectedSet.delete(value.value);
			});
			if (prevSelectedSet.size) {
				change = true;
			}
			return change ? data : prevSelected;
		})
	}, []);

	const onSubmit = useCallback(async (data: unknown) => {
		logger.info("Data");
		logger.info(data);

		const d = data as any ?? {};
		const cleanedData = {
			...d,
			title: typeof d.title === 'string' ? d.title.trim() : d.title,
			generalDescriptionForAi: typeof d.generalDescriptionForAi === 'string' ? d.generalDescriptionForAi.trim() : d.generalDescriptionForAi,
		};
		const parsedData = interviewCreateSchema.safeParse(cleanedData);

		if (parsedData.error) {
			showAlert({
				time: 4,
				title: "Validation Error",
				type: AlertType.error,
				message: parsedData.error.toString(),
			});
			return;
		}
		setLoading(true);
		const validatedData = parsedData.data;
		try {
			if (id) {
				await updateInterview({
					id, ...validatedData,
				});
			} else {
				const newId = await addInterview(validatedData);
				console.log(newId);
			}
			navigatorR('/interview');
		} catch (error: unknown) {
			const errorMessage = typeof error === 'string' ? error : (error instanceof Error ? error.message : '');
			showAlert({
				time: 4,
				title: "Something went wrong",
				type: AlertType.error,
				message: errorMessage
			});
			setLoading(false);
		}
	}, [showAlert, id, navigatorR, updateInterview, addInterview]);

	const setAllValuesInForm = useCallback((previousData: typeof interviewGetSchema._type) => {
		Object.entries(previousData).forEach(([key, value]) => {
			if (key === "createdAt") return;
			const typedKey = key as Exclude<keyof typeof previousData, "createdAt">;
			if (typedKey === 'id') {
				return;
			}
			if (typedKey === 'difficulty') {
				const selectedOptions: Array<{ label: string, value: string }> = [];
				Object.entries(previousData.difficulty ?? {}).forEach(([skill, difficulty]) => {
					const data = {
						...difficulty,
						difficulty: difficulty.difficulty,
					};
					setValue(`difficulty.${skill}` as const, data);
					selectedOptions.push({
						label: defaultOptionsValueToNameObj[skill] ?? skill,
						value: skill,
					});
				});
				setSelectedOptions(selectedOptions);
			}
			// Trim title and AI instructions when populating form from existing data
			if (typedKey === 'title' && typeof value === 'string') {
				setValue(typedKey, value.trim() as Exclude<typeof value, Date>);
			} else if (typedKey === 'generalDescriptionForAi' && typeof value === 'string') {
				setValue(typedKey, value.trim() as Exclude<typeof value, Date>);
			} else {
				setValue(typedKey, value as Exclude<typeof value, Date>);
			}
		});
	}, [defaultOptionsValueToNameObj, setValue]);


	useEffect(() => {
		setAppLoader(previousInterviewFetch.isLoading);
		if (previousInterviewFetch.error) {
			showAlert({
				time: 4,
				title: "Something went wrong",
				type: AlertType.error,
				message: "Error while loading interview data",
			});
			navigatorR('/interview');
		}
		if (previousInterviewFetch.data) {
			setAllValuesInForm(previousInterviewFetch.data);
		}
	}, [previousInterviewFetch.isLoading, previousInterviewFetch.error, previousInterviewFetch.data, setAppLoader, navigatorR, setAllValuesInForm, showAlert]);

	useEffect(() => {
		setSelectedTopics(selectedOptions.map(ele => ele.value));
	}, [selectedOptions]);

	useEffect(() => {
		const difficultyValues = form.getValues("difficulty") ?? {};
		Object.keys(difficultyValues).forEach((key) => {
			if (!selectedTopics.includes(key)) {
				form.unregister(`difficulty.${key}`);
			}
		});
	}, [selectedTopics, form]);

	return (
		<>
			<SiteHeader
				breadcrumbs={[
					{ label: "Interviews", href: "/interview" },
					{ label: id ? "Edit Interview" : "Create Interview" }
				]}
				backTo="/interview"
			/>
			<div className="flex flex-1 flex-col h-full">
				<div className="@container/main flex flex-1 flex-col h-full">
					<div className="flex flex-col py-2 h-full">
						<div className="flex-1 bg-background text-foreground">
							<div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-0 min-h-full">
								{/* Left Column */}
								<div className="px-4 lg:px-6">
									<Form
										{...form}
									>
										<form id="interview-form" onSubmit={handleSubmit(onSubmit)} className="mx-auto">
											<div className="space-y-8 py-6">
												{/* Basic Details Section */}
												<div className="space-y-4">
													<div className="pb-0">
														<h2 className="text-xl font-semibold">Basic Details</h2>
														<p className="text-sm text-muted-foreground">
															Specify basic details of this interview.
														</p>
													</div>
													<div className="space-y-6">
														<FormField
															control={form.control}
															name="title"
															render={({ field }) => (
																<FormItem>
																	<FormLabel>Title</FormLabel>
																	<FormControl>
																		<Input type="text" placeholder="Title for the interview" {...field} />
																	</FormControl>
																	<FormMessage />
																</FormItem>
															)}
														/>
														<FormField
															control={form.control}
															name="duration"
															render={() => (
																<FormItem>
																	<FormLabel>Duration (in minutes)</FormLabel>
																	<FormControl>
																		<Input type="number" placeholder="Duration in minutes" {...register("duration", { valueAsNumber: true, required: true })} />
																	</FormControl>
																	<FormMessage />
																</FormItem>
															)}
														/>
													</div>
												</div>

												<Separator className="mx-4 lg:mx-6 my-8" />

												{/* AI Instructions Section */}
												<div className="space-y-6">
													<div className="pb-0">
														<h2 className="text-xl font-semibold">Instructions For AI</h2>
														<p className="text-sm text-muted-foreground">
															Specify instruction for AI agent.
														</p>
													</div>
													<FormField
														name="generalDescriptionForAi"
														control={form.control}
														render={({ field }) => (
															<FormItem>
																<FormLabel>AI Instructions</FormLabel>
																<FormControl>
																	<Textarea
																		{...field}
																		placeholder={`Enter specific instructions for the AI interviewer...
Example: Focus on evaluating problem-solving skills, code quality, and edge-case handling.`}
																		className="resize-none min-h-[300px]"
																	/>
																</FormControl>
																<FormMessage />
															</FormItem>
														)}
													/>
												</div>
											</div>
										</form>
									</Form>
								</div>

								{/* Vertical Separator */}
								<div className="hidden lg:flex lg:justify-center lg:items-stretch min-h-full px-4 lg:px-6">
									<Separator orientation="vertical" className="w-px min-h-full" />
								</div>

								{/* Right Column */}
								<div className="px-4 lg:px-6">
									<div className="space-y-8 py-6">
										{/* Set Topics Section */}
										<div className="space-y-6">
											<div className="pb-0">
												<h2 className="text-xl font-semibold">Set Topics and Their Difficulty Level</h2>
												<p className="text-sm text-muted-foreground">
													Specify which topics to focus on and set their difficulty.
												</p>
											</div>
											<div className="space-y-6">
												<div>
													<Label className="mb-3 block">Key Topics / Skills</Label>
													<MultiSelect
														options={defaultOptions}
														defaultSelected={selectedOptions}
														onChange={handleSelectedTopics}
														placeholder="Select relevant topics"
													/>
												</div>
												<div className="space-y-4">
													{selectedTopics.map((topic, topicIndex) => {
														const title = defaultOptionsValueToNameObj[topic] ?? topic;
														const topicErrors = (form.formState.errors as any)?.difficulty?.[topic];
														return (
															<TopicCard
																key={topic}
																topic={topic}
																title={title}
																topicIndex={topicIndex}
																register={register}
																control={control}
																errors={topicErrors}
																watch={watch}
															/>
														)
													})}
												</div>

												{/* {selectedTopics.length > 0 && (
													<div className="flex items-center justify-between px-1 py-2 border-t border-dashed mt-2">
														<span className="text-sm font-medium text-muted-foreground">Total Weightage</span>
														<span className={cn(
															"text-sm font-bold",
															totalWeightage === 100 ? "text-green-600" : "text-destructive"
														)}>
															{totalWeightage}%
														</span>
													</div>
												)} */}
								{(form.formState.errors as any)?.difficulty?.message && (
									<p className="text-sm font-medium text-destructive">
										{(form.formState.errors as any).difficulty.message}
									</p>
								)}

											</div>
										</div>
									</div>
								</div>
							</div> {/* Close main grid container */}
						</div>
					</div>
				</div>
			</div>
			<SiteFooter>
				<Button
					disabled={loading}
					type="submit"
					form="interview-form"
					size="sm"
					className="h-8"
				>
					{loading &&
						<Loader2 className="h-4 w-4 animate-spin" />
					}
					Submit
				</Button>
			</SiteFooter>
		</>
	);
}
