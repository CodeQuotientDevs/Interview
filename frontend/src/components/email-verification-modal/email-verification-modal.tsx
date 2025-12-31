import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface EmailVerificationModalProps {
  isOpen: boolean;
  candidateEmail: string;
  onVerified: () => void;
}

type VerificationStatus = 'idle' | 'success' | 'error';

export const EmailVerificationModal = ({ isOpen, candidateEmail, onVerified }: EmailVerificationModalProps) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('idle');

  useEffect(() => {
    if (verificationStatus === 'success') {
      setEmail('');
      setError('');
      setVerificationStatus('idle');
      onVerified();
    }
  }, [verificationStatus, onVerified]);

  const handleVerify = async () => {
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setIsSubmitting(true);

    if (email.toLowerCase() !== candidateEmail.toLowerCase()) {
      setVerificationStatus('error');
      setError('Email does not match. Please try again.');
      setIsSubmitting(false);
      return;
    }

    setVerificationStatus('success');
    setIsSubmitting(false);
  };

  const isValidMatch = email.toLowerCase() === candidateEmail.toLowerCase() && email.trim() !== '';

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Verify Your Email</DialogTitle>
          <DialogDescription>Please enter your email address to continue with the interview.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(''); // Clear error when user starts typing
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isSubmitting) {
                  handleVerify();
                }
              }}
              disabled={isSubmitting}
              className="w-full"
            />
          </div>

          {error && (
            <Alert variant="destructive" className="w-full">
              <AlertDescription className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </AlertDescription>
            </Alert>
          )}

          {isValidMatch && (
            <Alert className="border-green-200 bg-green-50 w-full">
              <AlertDescription className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                <span>Email matches!</span>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end pt-4">
            <Button type="button" onClick={handleVerify} disabled={isSubmitting || !email.trim()} className="w-full sm:w-auto">
              {isSubmitting ? 'Verifying...' : 'Verify'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
