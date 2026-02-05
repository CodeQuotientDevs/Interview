import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DateTimePicker } from '../ui/datetimepicker';
import { Textarea } from '../ui/textarea';
import logger from '@/lib/logger';
import { Loader2, Trash2, Paperclip } from 'lucide-react';
import { useAppStore } from '@/store';
import { AlertType } from '@/constants';
import { zodResolver } from '@hookform/resolvers/zod';
import { candidateInviteSchema } from '@/zod/candidate';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import axios from 'axios';
import { useMainStore } from '@/store';

export interface CandidateInvite {
  name: string;
  email: string;
  phone?: string;
  yearOfExperience?: number;
  startTime: Date;
  endTime?: Date | null;
  userSpecificDescription: string;
  attachments?: Array<{ url: string, originalName: string }>;
}

interface CandidateSidebarProps {
  open: boolean;
  defaultValues?: CandidateInvite;
  setOpenDrawer: (value: boolean) => void;
  handleSaveData: (data: CandidateInvite) => Promise<void>;
  isEditing?: boolean;
}

export default function CandidateSidebar(props: CandidateSidebarProps) {
  const { open, defaultValues, setOpenDrawer, handleSaveData, isEditing = false } = props;
  const [loading, setLoading] = useState<boolean>(false);
  const [attachments, setAttachments] = useState<Array<{ name: string, url: string, loading: boolean }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const getPresignedUrl = useMainStore().getPresignedUrl;

  const showAlert = useAppStore().showAlert;
  const formRef = useRef<HTMLFormElement>(null);
  const form = useForm<CandidateInvite>({
    resolver: zodResolver(candidateInviteSchema)
  });

  // const {
  //     register,
  // } = form;

  const onSubmit = async (data: CandidateInvite) => {
    try {
      setLoading(true);
      if (data.startTime < new Date()) {
        showAlert({
          time: 4,
          title: 'Invalid Start Date',
          type: AlertType.error,
          message: 'Start Date should be greater than or equal to current time'
        });
        return;
      }
      if (data.endTime && data.endTime < new Date()) {
        showAlert({
          time: 4,
          title: 'Invalid Start Date',
          type: AlertType.error,
          message: 'End Date should be greater than or equal to current time'
        });
        return;
      }
      if (data.name.trim() === '') {
        showAlert({
          time: 4,
          title: 'Invalid Name',
          type: AlertType.error,
          message: 'Name should not be empty'
        });
        return;
      }
      await handleSaveData(data);
    } catch (error) {
      logger.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      setAttachments(prev => [...prev, { name: file.name, url: '', loading: true }]);

      try {
        // Get presigned URL
        const { uploadUrl, fileUrl } = await getPresignedUrl(file.type);

        // Upload to S3
        await axios.put(uploadUrl, file, {
          headers: { 'Content-Type': file.type }
        });

        // Update state with URL
        setAttachments(prev => prev.map(att =>
          att.name === file.name ? { ...att, url: fileUrl, loading: false } : att
        ));

        // Populate form
        const currentAttachments = form.getValues('attachments') || [];
        form.setValue('attachments', [...currentAttachments, { url: fileUrl, originalName: file.name }]);

      } catch (error) {
        logger.error(error as Error);
        showAlert({
          time: 5,
          title: "Upload Failed",
          message: "Could not upload file",
          type: AlertType.error
        });
        setAttachments(prev => prev.filter(att => att.name !== file.name));
      }
    }
  };

  const removeAttachment = (index: number) => {
    const newAttachments = [...attachments];
    const removed = newAttachments.splice(index, 1);
    setAttachments(newAttachments);

    const currentAttachmentsList = form.getValues('attachments') || [];
    form.setValue('attachments', currentAttachmentsList.filter(att => att.url !== removed[0].url));
  };

  const onClose = useCallback(() => {
    form.reset({
      name: '',
      email: '',
      phone: '',
      yearOfExperience: '' as unknown as undefined,
      startTime: new Date(),
      endTime: null,
      userSpecificDescription: ''
    });
    setAttachments([]);
    setOpenDrawer(false);
  }, [setOpenDrawer, form]);

  useEffect(() => {
    if (!open) {
      onClose();
    }
  }, [onClose, open]);

  useEffect(() => {
    if (isEditing && defaultValues) {
      form.reset(defaultValues);
      if (defaultValues.attachments) {
        setAttachments(defaultValues.attachments.map(att => ({
          name: att.originalName || att.url.split('/').pop() || 'Attachment',
          url: att.url,
          loading: false
        })));
      }
    }
  }, [defaultValues?.email, open]);

  return (
    <Dialog open={open} onOpenChange={setOpenDrawer}>
      <DialogContent onInteractOutside={(event) => event.preventDefault()} className="max-h-[90vh] overflow-y-auto sm:max-w-[80%] sm:w-[600px] !w-[900px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Resend Invite' : 'Invite Candidate'}</DialogTitle>
          <DialogDescription>{isEditing ? 'Update candidate details to resend invitation.' : 'Enter candidate details to send new invitation.'}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form ref={formRef} onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <div className="flex gap-4 flex-1 overflow-y-auto pb-3">
              {/* Invite Details Section */}
              <div className="relative border rounded-lg p-4 pt-6 space-y-4 flex-1 mt-2">
                <h3 className="absolute -top-3 left-1/2 -translate-x-1/2 bg-background px-2 font-semibold text-base text-foreground">Invite Details</h3>

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
                        <Input
                          type="email"
                          placeholder="Candidate email"
                          {...field}
                          readOnly={isEditing}
                          className={isEditing ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}
                        />
                      </FormControl>
                      {isEditing && <p className="text-sm text-muted-foreground">Email cannot be changed. To invite a different candidate, add a new candidate instead.</p>}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (optional)</FormLabel>
                      <FormControl>
                        <Input type="text" placeholder="Candidate phone" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex  col justify-between gap-3">
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                            <DateTimePicker
                              date={field.value}
                              placeHolder="Start Time"
                              setDate={(date) => {
                                const clean = removeSeconds(date);
                                if (clean && clean < new Date()) {
                                  showAlert({
                                    time: 4,
                                    title: 'Invalid Start Date',
                                    type: AlertType.error,
                                    message: 'Start Date should be greater than or equal to current time'
                                  });
                                }

                                field.onChange(clean);

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
                      <FormItem>
                        <FormLabel>End Time</FormLabel>
                        <FormControl>
                          <DateTimePicker
                            date={field.value ?? undefined}
                            placeHolder="End Time (optional)"
                            setDate={(date) => {
                              if (date < new Date()) {
                                showAlert({
                                  time: 4,
                                  title: 'Invalid End Date',
                                  type: AlertType.error,
                                  message: 'End Date should be greater than or equal to current time'
                                });
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
              </div>

              {/* Candidate Details Section */}
              <div className="relative border rounded-lg p-4 pt-6 space-y-4 flex-1 mt-2">
                <h3 className="absolute -top-3 left-1/2 -translate-x-1/2 bg-background px-2 font-semibold text-base text-foreground">Candidate Details</h3>

                <FormField
                  control={form.control}
                  name="yearOfExperience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year of Experience (optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Candidate year of experience"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="userSpecificDescription"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <div className="flex justify-between items-center group">
                        <FormLabel className="group-hover:text-primary transition-colors">Description</FormLabel>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            className="h-7 px-2 text-[11px] font-medium border-dashed border-primary/50 text-primary hover:bg-primary/5 hover:border-primary transition-all flex items-center gap-1"
                          >
                            <Paperclip className="h-3 w-3" />
                            Attach PDF/Image
                          </Button>
                          <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="application/pdf,image/*"
                            onChange={handleFileSelect}
                          />
                        </div>
                      </div>
                      <FormControl>
                        <Textarea className="resize-none h-[120px] focus-visible:ring-primary/20 transition-all border-muted-foreground/20" placeholder="Enter candidate description or additional notes...&#10;&#10;Example:&#10;A candidate resume is attached.&#10;Use it to assess qualifications, experience, and role fit." {...field} />
                      </FormControl>

                      {/* Attachments List */}
                      <div className="space-y-2 pt-1">
                        {attachments.length > 0 && (
                          <div className="text-[10px] font-bold text-muted-foreground uppercase pl-1">Attached Supporting Documents</div>
                        )}
                        <div className="grid gap-2">
                          {attachments.map((att, index) => (
                            <div key={index} className="flex justify-between items-center text-xs border bg-muted/20 hover:bg-muted/40 p-2 rounded-lg border-muted/30 transition-colors group/item">
                              <span className="truncate max-w-[320px] flex items-center gap-2 font-medium">
                                <div className="w-full rounded-full bg-primary" />
                                {att.name}
                              </span>
                              {att.loading ? (
                                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                              ) : (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeAttachment(index)}
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover/item:opacity-100"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="border-t pt-4 mt-4 flex justify-end">
              <Button onClick={() => formRef.current?.requestSubmit()} disabled={loading}>
                {loading && <Loader2 className="mr-2 animate-spin" />}
                Submit
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function removeSeconds(date?: Date | string | null) {
  if (!date) return undefined;
  const d = new Date(date);
  d.setSeconds(0);
  d.setMilliseconds(0);
  return d;
}
