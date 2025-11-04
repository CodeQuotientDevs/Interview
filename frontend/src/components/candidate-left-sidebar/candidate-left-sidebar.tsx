import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useCallback, useEffect, useRef, useState } from "react";
import { DateTimePicker } from "../ui/datetimepicker";
import { Textarea } from "../ui/textarea";
import logger from "@/lib/logger";
import { Loader2 } from "lucide-react";
import { useAppStore } from "@/store";
import { AlertType } from "@/constants";
import { zodResolver } from "@hookform/resolvers/zod";
import { candidateInviteSchema } from "@/zod/candidate";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

export interface CandidateInvite {
    name: string;
    email: string;
    phone?: string;
    yearOfExperience: number,
    startTime: Date,
    endTime?: Date,
    userSpecificDescription: string,
}

interface CandidateSidebarProps {
    open: boolean;
    defaultValues?: CandidateInvite,
    setOpenDrawer: (value: boolean) => void
    handleSaveData: (data: CandidateInvite) => Promise<void>
}

export default function CandidateSidebar(props: CandidateSidebarProps) {
    const { open, defaultValues, setOpenDrawer, handleSaveData } = props;
    const [loading, setLoading] = useState<boolean>(false);

    const showAlert = useAppStore().showAlert;
    const formRef = useRef<HTMLFormElement>(null);
    const form = useForm<CandidateInvite>({
        defaultValues: defaultValues ?? {},
        resolver: zodResolver(candidateInviteSchema),
    });

    const {
        register,
    } = form;

    const onSubmit = async (data: CandidateInvite) => {
        try {
            setLoading(true);
            await handleSaveData(data);
            formRef.current?.reset();
            form.reset();
            onClose();
        } catch (error) {
            logger.error(error);
        }
        setLoading(false);
    };

    const onClose = useCallback(() => {
        form.reset();
        formRef.current?.reset();
        setOpenDrawer(false);
    }, [setOpenDrawer, form]);

    useEffect(() => {
        if (!open) {
            onClose();
        }
    }, [onClose, open]);

    return (
    <Dialog open={open} onOpenChange={setOpenDrawer}>
        <DialogContent onInteractOutside={(event) => event.preventDefault()} className="max-h-[90vh] overflow-y-auto sm:max-w-[80%] sm:w-auto">
            <DialogHeader>
            <DialogTitle>Invite Candidate</DialogTitle>
            <DialogDescription>Enter candidate details below.</DialogDescription>
            </DialogHeader>

            <Form {...form}>
            <form
                ref={formRef}
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
            >
                <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                        <Input type="text" placeholder="Name of candidate" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />

                <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                        <Input type="email" placeholder="Candidate email" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />

                <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                        <Input type="text" placeholder="Candidate phone (optional)" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />

                <FormField
                control={form.control}
                name="yearOfExperience"
                render={() => (
                    <FormItem>
                    <FormLabel>Year of Experience</FormLabel>
                    <FormControl>
                        <Input
                        type="number"
                        placeholder="Candidate year of experience"
                        {...register("yearOfExperience", {
                            required: true,
                            max: 50,
                            valueAsNumber: true,
                            min: 0,
                        })}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />

                <div className="flex flex-col sm:flex-row gap-3">
                <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                    <FormItem className="flex-1">
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                        <DateTimePicker
                            date={field.value}
                            placeHolder="Start Time"
                            setDate={(date) => {
                            if (date < new Date()) {
                                showAlert({
                                time: 4,
                                title: "Invalid Start Date",
                                type: AlertType.error,
                                message:
                                    "Start Date should be greater than or equal to current time",
                                });
                                field.onChange(new Date());
                                return;
                            }
                            field.onChange(date);
                            }}
                        />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                    <FormItem className="flex-1">
                        <FormLabel>End Time</FormLabel>
                        <FormControl>
                        <DateTimePicker
                            date={field.value}
                            placeHolder="End Time (optional)"
                            setDate={(date) => {
                            if (date < new Date()) {
                                showAlert({
                                time: 4,
                                title: "Invalid End Date",
                                type: AlertType.error,
                                message:
                                    "End Date should be greater than or equal to current time",
                                });
                                field.onChange(new Date());
                                return;
                            }
                            field.onChange(date);
                            }}
                        />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                </div>

                <FormField
                name="userSpecificDescription"
                control={form.control}
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Candidate Details</FormLabel>
                    <FormControl>
                        <Textarea
                        className="resize-none h-[100px]"
                        placeholder="Candidate description"
                        {...field}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </form>

            <DialogFooter className="pt-4">
                <Button
                onClick={() => formRef.current?.requestSubmit()}
                disabled={loading}
                >
                {loading && <Loader2 className="mr-2 animate-spin" />}
                Submit
                </Button>
            </DialogFooter>
            </Form>
        </DialogContent>
    </Dialog>

    );
}
