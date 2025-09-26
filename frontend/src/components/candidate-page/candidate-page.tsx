import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { DateTimePicker } from "@/components/ui/datetimepicker";
import MultiSelect, { Option } from "@/components/ui/multi-select";
import { interviewCreateSchema } from "@/zod/interview";
import { useAppStore, useMainStore } from "@/store"
import { useNavigate } from "react-router";
import { AlertType } from "@/constants";

interface CandidatePageProps {
	id?: string
}

export default function CandidatePage(props: CandidatePageProps) {
	const { id } = props;
	const {
		control,
		handleSubmit,
		register,
		watch,
		setValue,
	} = useForm();

	const navigatorR = useNavigate();
	const addInterview = useMainStore().addInterview;
	const updateInterview = useMainStore().updateInterview;
	const [loading, setLoading] = useState<boolean>(false);
	const [selectedTopics, setSelectedTopics] = useState<Array<string>>([]);
	const [startDate, setStartDate] = useState<Date | undefined>(undefined);
	const [endDate, setEndDate] = useState<Date | undefined>(undefined);
	const [selectedOptions, setSelectedOptions] = useState<Array<{ label: string, value: string }>>([])
	const showAlert = useAppStore().showAlert;
	const defaultOptions = useMemo(() => (
		[
			{ label: "JavaScript", value: "js" },
			{ label: "React", value: "react" },
			{ label: "Node.js", value: "node" },
		]
	), []);

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
		console.log(data);
		const parsedData = interviewCreateSchema.safeParse(data);
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
				await updateInterview({ id, ...validatedData });
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

	useEffect(() => {
		setSelectedTopics(selectedOptions.map(ele => ele.value));
	}, [selectedOptions]);

	useEffect(() => {
		console.log(startDate);
		setValue('startTime', startDate);
	}, [startDate, setValue]);

	useEffect(() => {
		if (startDate && endDate) {
			if (startDate > endDate) {
				showAlert({
					time: 4,
					title: "Validation Error",
					type: AlertType.error,
					message: 'start date is greater then end date'
				});
				setValue('endDate', undefined);
				setEndDate(undefined);
				return;
			}
		}
		setValue('endTime', endDate);
	}, [startDate, endDate, setEndDate, setValue, showAlert]);

	return (
		<div className="min-h-screen bg-background text-foreground p-6">
			<form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl mx-auto space-y-6">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<Card>
						<CardHeader>
							<CardTitle>Candidate Basic Details</CardTitle>
							<CardDescription>Specify candidate basic details</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								<div>
									<Label>Candidate Name</Label>
									<Input
										{...register("name", { required: "Name is required" })}
										placeholder="Enter candidate name"
									/>
								</div>
								<div>
									<Label>Email</Label>
									<Input
										type="email"
										{...register("email", { required: "Email is required" })}
										placeholder="Enter candidate email"
									/>
								</div>
								<div>
									<Label>Phone Number</Label>
									<Input {...register("phone", { required: "Phone number is required." })} placeholder="Enter candidate phone number" />
								</div>
								<div>
									<Label>Job Title / Role</Label>
									<Input {...register("jobTitle", { required: "Job title is required." })} placeholder="e.g., Frontend Developer" />
								</div>
								<div>
									<Label>Years of Experience</Label>
									<Input
										type="number"
										{...register("yearOfExperience", { valueAsNumber: true, required: true })}
										placeholder="e.g., 5"
									/>
								</div>
							</div>
						</CardContent>
					</Card>
					<div className=" ">
						<Card>
							<CardHeader className="flex w-full h-full">
								<CardTitle>Candidate bio</CardTitle>
								<CardDescription>Specify candidate bio</CardDescription>
								<div className="flex flex-col h-full min-h-0">
									<Textarea
										{...register("description", { required: "Description is required" })}
										placeholder="Candidate description"
										className="resize-none flex-grow"
									/>
								</div>
							</CardHeader>
						</Card>
					</div>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<Card>
						<CardHeader>
							<CardTitle>Set topics and their difficulty level</CardTitle>
							<CardDescription>Specify which topics you want to focus on and set their difficulty</CardDescription>
						</CardHeader>
						<CardContent>
							<div>
								<Label>Key Topics / Skills</Label>
								<MultiSelect
									options={defaultOptions}
									defaultSelected={selectedOptions}
									onChange={handleSelectedTopics}
									placeholder="Select relevant topics"
								/>
							</div>
							{selectedTopics.map((topic) => (
								<div key={topic} className="flex items-center gap-4 mb-4">
									{/* Topic label */}
									<span className="w-24 font-medium">{topic}</span>
									{/* Slider */}
									<Controller
										name={`difficulty.${topic}.difficulty`}
										control={control}
										defaultValue={1}
										render={({ field }) => (
											<>
												<Slider
													min={1}
													max={3}
													step={1}
													value={[field.value]}
													onValueChange={(val) => field.onChange(val[0])}
													className="h-2 flex-grow" // Reduced height and flexible width
												/>
												<div>
													<Input
														placeholder="Topic weight"

													/>
													<Input
														placeholder="Topic duration"
													/>
												</div>
											</>

										)}
									/>
									{/* Difficulty label */}
									<span className="w-16 text-sm text-right">
										{watch(`difficulty.${topic}`) === 3
											? "Hard"
											: watch(`difficulty.${topic}`) === 2
												? "Medium"
												: "Easy"}
									</span>
								</div>
							))}
						</CardContent>
					</Card>
					<Card>
						<CardHeader>
							<CardTitle>Interview Details</CardTitle>
							<CardDescription>Specify interview related details</CardDescription>
						</CardHeader>
						<CardContent>

							<Label>Start Time</Label>
							<Input className="hidden" type="datetime-local" {...register("startTime", { valueAsDate: true, value: startDate })} />
							<DateTimePicker date={startDate} setDate={setStartDate} />

							<Label>End Time</Label>
							<Input className="hidden" type="datetime-local" {...register("endTime", { valueAsDate: true, value: endDate })} />
							<DateTimePicker date={endDate} setDate={setEndDate} />

							<Label>Duration of interview</Label>
							<Input type="number" placeholder="Enter interview time in minuets" {...register("duration", { valueAsNumber: true })} />
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
		</div>
	);
}
