import { useForm } from "react-hook-form";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
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
    const drawerRef = useRef<HTMLDivElement | null>(null);
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
        <Drawer open={open} onOpenChange={setOpenDrawer}>
            <DrawerContent ref={drawerRef} className="max-h-[80vh] flex flex-col">
                <DrawerHeader>
                    <DrawerTitle>Invite Candidate</DrawerTitle>
                    <DrawerDescription>Enter candidate details below.</DrawerDescription>
                </DrawerHeader>
                <Form {...form}>
                    <form ref={formRef} onSubmit={form.handleSubmit(onSubmit)} className="p-4 space-y-4 h-[100vh] overflow-y-scroll">
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
                                        <Input placeholder="Candidate email" type="email" {...field} />
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
                                        <Input placeholder="Candidate phone number (optional)" type="text" {...field} />
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
                                    <FormLabel>
                                        Year Of Experience
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Candidate year of experience"
                                            type="number"
                                            {...register("yearOfExperience", {
                                                required: true, max: 50, valueAsNumber: true, min: 0,
                                            })}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        >
                        </FormField>
                        <div className="flex flex-grow gap-3">
                            <FormField
                                control={form.control}
                                name="startTime"
                                render={({ field }) => (
                                    <FormItem className="w-full">
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
                                                            message: "Start Date should be greater then or equal to current time"
                                                        });
                                                        field.onChange(new Date());
                                                        return;
                                                    }
                                                    field.onChange(date)
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
                                    <FormItem className="w-full">
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
                                                            message: "End Date should be greater then or equal to current time"
                                                        });
                                                        field.onChange(new Date());
                                                        return;
                                                    }
                                                    field.onChange(date)
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
                                    <FormLabel>
                                        Candidate Details
                                    </FormLabel>
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
                    <DrawerFooter>
                        <Button
                            className="w-fit m-auto"
                            onClick={() => {
                                formRef.current?.requestSubmit();
                            }} disabled={loading}
                        >
                            {loading
                                && <Loader2 className="animate-spin" />}
                            Submit
                        </Button>
                    </DrawerFooter>
                </Form>

            </DrawerContent>
        </Drawer>
    );
}
