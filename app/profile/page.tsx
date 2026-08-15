'use client';

import { useEffect, useState } from 'react';
import { Lock, Mail, Phone, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { ApiError, authService } from '@/services';
import { cn, initials, passwordStrength, validators } from '@/lib/utils';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { InlineError } from '@/components/ui/Feedback';
import { Footer } from '@/components/layout/Footer';

/**
 * Profile page.
 *
 * Keeping the phone number current matters for more than tidiness: the booking
 * form and the chatbot both prefill from it, so a patient who fills it in here
 * never types it again.
 *
 * Email is shown read-only. Changing it would need a verification flow to stop
 * an account being pointed at an address its owner does not control — noted in
 * the README as out of scope for the prototype.
 */
function ProfileContent() {
  const { user, updateProfile } = useAuth();
  const toast = useToast();

  const [profile, setProfile] = useState({ name: '', phone: '' });
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [passwordFormError, setPasswordFormError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    setProfile({ name: user.name, phone: user.phone ?? '' });
  }, [user]);

  const strength = passwordStrength(passwords.newPassword);

  const handleProfileSave = async (event: React.FormEvent) => {
    event.preventDefault();

    const errors: Record<string, string> = {};
    const nameError = validators.name(profile.name);
    const phoneError = validators.phone(profile.phone, false);
    if (nameError) errors.name = nameError;
    if (phoneError) errors.phone = phoneError;

    setProfileErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSavingProfile(true);
    try {
      await updateProfile({
        name: profile.name.trim(),
        phone: profile.phone.trim() || null,
      });
      toast.success('Profile updated');
    } catch (error) {
      toast.error(
        'Could not save',
        error instanceof ApiError ? error.message : 'Please try again.',
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSave = async (event: React.FormEvent) => {
    event.preventDefault();

    const errors: Record<string, string> = {};
    if (!passwords.currentPassword) errors.currentPassword = 'Your current password is required.';
    const newPasswordError = validators.password(passwords.newPassword);
    if (newPasswordError) errors.newPassword = newPasswordError;

    setPasswordErrors(errors);
    setPasswordFormError(null);
    if (Object.keys(errors).length > 0) return;

    setSavingPassword(true);
    try {
      await authService.changePassword(passwords);
      toast.success('Password changed');
      setPasswords({ currentPassword: '', newPassword: '' });
    } catch (error) {
      setPasswordFormError(
        error instanceof ApiError ? error.message : 'Could not change your password.',
      );
    } finally {
      setSavingPassword(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-gradient font-display text-xl font-bold text-brand-on-solid">
            {initials(user.name)}
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold tracking-tight text-content">
              {user.name}
            </h1>
            <p className="truncate text-sm text-content-muted">{user.email}</p>
            {user.role === 'ADMIN' && (
              <span className="mt-1.5 inline-flex rounded-full bg-brand-500/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-text">
                Administrator
              </span>
            )}
          </div>
        </div>

        <Card className="mt-8">
          <CardHeader
            title="Your details"
            description="Used to prefill the booking form and to reach you about appointments."
          />
          <form onSubmit={handleProfileSave} className="mt-5 space-y-4" noValidate>
            <Input
              label="Full name"
              value={profile.name}
              onChange={(event) => setProfile({ ...profile, name: event.target.value })}
              error={profileErrors.name}
              leftIcon={<UserIcon className="h-4 w-4" />}
            />
            <Input
              label="Phone number"
              type="tel"
              value={profile.phone}
              onChange={(event) => setProfile({ ...profile, phone: event.target.value })}
              error={profileErrors.phone}
              leftIcon={<Phone className="h-4 w-4" />}
              placeholder="+1 415 555 0123"
              hint="Saved here, filled in automatically whenever you book."
            />
            <Input
              label="Email address"
              value={user.email}
              disabled
              leftIcon={<Mail className="h-4 w-4" />}
              hint="Contact the clinic to change the email on your account."
            />
            <div className="flex justify-end">
              <Button type="submit" loading={savingProfile}>
                Save changes
              </Button>
            </div>
          </form>
        </Card>

        <Card className="mt-5">
          <CardHeader title="Password" description="Choose something you don't use elsewhere." />
          <form onSubmit={handlePasswordSave} className="mt-5 space-y-4" noValidate>
            {passwordFormError && <InlineError message={passwordFormError} />}

            <Input
              label="Current password"
              type="password"
              autoComplete="current-password"
              value={passwords.currentPassword}
              onChange={(event) =>
                setPasswords({
                  ...passwords,
                  currentPassword: event.target.value,
                })
              }
              error={passwordErrors.currentPassword}
              leftIcon={<Lock className="h-4 w-4" />}
            />

            <div>
              <Input
                label="New password"
                type="password"
                autoComplete="new-password"
                value={passwords.newPassword}
                onChange={(event) =>
                  setPasswords({
                    ...passwords,
                    newPassword: event.target.value,
                  })
                }
                error={passwordErrors.newPassword}
                leftIcon={<Lock className="h-4 w-4" />}
              />
              {passwords.newPassword && !passwordErrors.newPassword && (
                <div className="mt-2">
                  <div className="flex gap-1" aria-hidden>
                    {[1, 2, 3, 4].map((level) => (
                      <span
                        key={level}
                        className={cn(
                          'h-1 flex-1 rounded-full transition-colors duration-300',
                          strength.score >= level
                            ? strength.score <= 1
                              ? 'bg-red-500'
                              : strength.score === 2
                                ? 'bg-amber-500'
                                : strength.score === 3
                                  ? 'bg-lime-500'
                                  : 'bg-green-500'
                            : 'bg-line',
                        )}
                      />
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-content-subtle">
                    Strength: <span className="font-medium">{strength.label}</span>
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button type="submit" loading={savingPassword}>
                Change password
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <Footer />
    </>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}
