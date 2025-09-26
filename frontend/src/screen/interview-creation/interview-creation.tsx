import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TagInput, Tag } from "emblor"


import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import MultiSelect, { Option } from "@/components/ui/multi-select";
import { interviewCreateSchema, interviewGetSchema } from "@/zod/interview";
import { useAppStore, useMainStore } from "@/store"
import { useNavigate } from "react-router";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage, Form } from "@/components/ui/form";
import { useQuery } from "@tanstack/react-query";
import { AlertType } from "@/constants";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectLabel, SelectItem } from "@/components/ui/select";
import logger from "@/lib/logger";
import { zodResolver } from "@hookform/resolvers/zod";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// import { useMutation, useQueries, useQuery } from "@tanstack/react-query";

interface CandidatePageProps {
	id?: string
}

export function InterviewCreation(props: CandidatePageProps) {
	const { id } = props;
	const form = useForm<Zod.infer<typeof interviewCreateSchema>>({
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
	const [keywords, setKeywords] = useState<Tag[]>([]);
	const [selectedTopics, setSelectedTopics] = useState<Array<string>>([]);
	const [selectedOptions, setSelectedOptions] = useState<Array<{ label: string, value: string }>>([])
	const [activeKeyword, setActiveKeyword] = useState<number | null>(null);

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
		logger.info("Data", data);
		const parsedData = interviewCreateSchema.safeParse(data);
		if (parsedData.data?.difficulty) {
			const totalWeight = Object.values(parsedData.data?.difficulty).reduce((result, current) => result += current.weight, 0);
			if (Math.abs(totalWeight) !== 100) {
				showAlert({
					time: 4,
					title: "Topics Weight not valid",
					type: AlertType.error,
					message: "Total weight percentage should round off to 100%",
				});
				return;
			}
		}
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
			const typedKey = key as keyof typeof previousData;
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
			if (typedKey === 'keywords' && Array.isArray(value)) {
				setValue('keywords', value);
				setKeywords(value.map((value) => ({ id: crypto.randomUUID(), text: value })));
			}
			setValue(typedKey, value);
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
		<div className="min-h-screen bg-background text-foreground p-6">
			<Form
				{...form}
			>
				<form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl mx-auto space-y-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<Card>
							<CardHeader className="border-b pb-4">
								<CardTitle className="text-xl font-semibold">Basic Details</CardTitle>
								<CardDescription className="text-sm text-muted-foreground">
									Specify basic details of this interview.
								</CardDescription>
							</CardHeader>
							<CardContent className="pt-6">
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
							</CardContent>
							<CardContent>
								<FormField
									control={form.control}
									name="duration"
									render={() => (
										<FormItem>
											<FormLabel>Duration</FormLabel>
											<FormControl>
												<Input type="number" placeholder="Title for the interview" {...register("duration", { valueAsNumber: true, required: true })} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</CardContent>
							<CardContent>
								<FormField
									control={control}
									name="keywords"
									render={({ field }) => (
										<FormItem className="flex flex-col items-start">
											<FormLabel className="text-left">Keywords</FormLabel>
											<FormDescription className="text-left">
												The keywords for the interview.
											</FormDescription>
											<FormControl className="w-full">
												<TagInput
													{...field}
													activeTagIndex={activeKeyword}
													setActiveTagIndex={setActiveKeyword}
													placeholder="Enter keywords (optional)"
													tags={keywords}
													className="sm:min-w-[450px]"
													setTags={(newTags) => {
														setKeywords(newTags);
														const valueToSet: Array<string> = [];
														for (const tag of (newTags as Array<Tag>)) {
															valueToSet.push(tag.text);
														}
														setValue('keywords', valueToSet);
													}}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</CardContent>
						</Card>
						<Card className="row-span-2 flex flex-col">
							<FormField
								name="generalDescriptionForAi"
								control={form.control}
								render={({ field }) => (
									<FormItem className="h-full w-full flex flex-col">
										<CardHeader className="border-b pb-4">
											<FormLabel>
												<CardTitle className="text-xl font-semibold">Instructions For Ai</CardTitle>
											</FormLabel>
											<CardDescription className="text-sm text-muted-foreground">
												Specify instruction for AI agent. You can also add specific questions for the candidate.
											</CardDescription>
										</CardHeader>
										<CardContent className="pt-2 h-full">
											<Textarea
												{...field}
												placeholder="Ai Instructions"
												className="resize-none flex-grow min-h-[300px] w-full h-full"
											/>
										</CardContent>
									</FormItem>
								)}
							/>
						</Card>
						<Card>
							<CardHeader className="border-b pb-4">
								<CardTitle className="text-xl font-semibold">Set Topics and Their Difficulty Level</CardTitle>
								<CardDescription className="text-sm text-muted-foreground">
									Specify which topics to focus on and set their difficulty.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="pt-6 pb-4">
									<Label>Key Topics / Skills</Label>
									<MultiSelect
										options={defaultOptions}
										defaultSelected={selectedOptions}
										onChange={handleSelectedTopics}
										placeholder="Select relevant topics"
									/>
								</div>
								{selectedTopics.map((topic) => {
									const title = defaultOptionsValueToNameObj[topic] ?? topic;
									return (
										<>
											<div key={topic} className="border p-2 rounded-md">
												<div className="border-b-2 text-center mb-2">
													<span className="w-24 font-medium">{title}</span>
												</div>
												<Table className="table-fixed w-full">
													<TableHeader>
														<TableRow>
															<TableHead className="min-w-[100px] w-[100px]">Weight</TableHead>
															<TableHead className="min-w-[100px] w-[100px]">Duration (min)</TableHead>
															<TableHead className="min-w-[100px] w-[100px]">Difficulty</TableHead>
														</TableRow>
													</TableHeader>
													<TableBody>
														<TableRow>
															<TableCell className="w-[100px]">
																<Input type="number" placeholder="Weight" {...register(`difficulty.${topic}.weight`, { required: true, valueAsNumber: true })} />
															</TableCell>
															<TableCell className="w-[100px]">
																<Input type="number" placeholder="Duration" {...register(`difficulty.${topic}.duration`, { required: true, valueAsNumber: true })} />
															</TableCell>
															<TableCell className="w-[100px]">
																<Controller
																	name={`difficulty.${topic}.difficulty`}
																	control={control}
																	defaultValue={1}
																	rules={{ required: true }}
																	render={({ field }) => (
																		<Select onValueChange={field.onChange} value={field?.value?.toString()}>
																			<SelectTrigger className="w-full">
																				<SelectValue placeholder="Difficulty" />
																			</SelectTrigger>
																			<SelectContent>
																				<SelectGroup>
																					<SelectLabel>Difficulty</SelectLabel>
																					<SelectItem value={"1"}>Easy</SelectItem>
																					<SelectItem value={"2"}>Medium</SelectItem>
																					<SelectItem value={"3"}>Hard</SelectItem>
																				</SelectGroup>
																			</SelectContent>
																		</Select>
																	)}
																/>
															</TableCell>
														</TableRow>
													</TableBody>
												</Table>
											</div >
										</>
									)
								})}
							</CardContent>
						</Card>
					</div>
					<div className="w-full flex justify-center">
						<Button disabled={loading} type="submit" className="w-full max-w-fit m-auto">
							{loading &&
								<Loader2 className="animate-spin" />
							}
							Submit
						</Button>
					</div>
				</form>
			</Form>

		</div >
	);
}
